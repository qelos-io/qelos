import { describe, expect, it } from 'vitest';
import { buildFlowGraph, diagnose, emits, flowOf, listensTo, relationsOf, standaloneIds, subgraph, type FlowIntegration } from '../flow-graph';
import { layoutFlow } from '../flow-layout';

const sources = { q: { _id: 'q', name: 'Qelos' }, m: { _id: 'm', name: 'Mail' }, s: { _id: 's', name: 'Slack' } };
const sig = (eventName: string, source = 'qelos', kind = 'flow') => ({ source, kind, eventName });

const make = (id: string, listen?: ReturnType<typeof sig>, emit?: ReturnType<typeof sig>, extra: Partial<FlowIntegration> = {}): FlowIntegration => ({
  _id: id,
  active: true,
  kind: ['qelos', 'qelos'],
  trigger: { source: 'q', operation: listen ? 'webhook' : 'mcpTool', details: { name: id, ...(listen || {}) } },
  target: { source: 'm', operation: 'send', details: emit ? { triggerResponse: emit } : {} },
  dataManipulation: [{}, {}],
  targetManipulation: [{}],
  ...extra,
});

// signup (platform event) -> welcome -> notify ; audit is on its own
const welcome = make('welcome', sig('signup', 'auth', 'signup'), sig('welcome.sent'));
const notify = make('notify', sig('welcome.sent'), sig('notified'));
const audit = make('audit');
const all = [welcome, notify, audit];

describe('signatures', () => {
  it('reads what an integration listens to and emits', () => {
    expect(listensTo(welcome)).toEqual(sig('signup', 'auth', 'signup'));
    expect(emits(welcome)).toEqual(sig('welcome.sent'));
    expect(listensTo(audit)).toBeUndefined();
  });

  it('needs a complete signature and a webhook trigger', () => {
    expect(listensTo(make('x', { source: 'a', kind: 'b', eventName: '' }))).toBeUndefined();
    expect(emits(make('x', undefined, { source: 'a', kind: '', eventName: 'e' }))).toBeUndefined();
    expect(listensTo({ trigger: { operation: 'mcpTool', details: sig('e') } })).toBeUndefined();
  });
});

describe('buildFlowGraph', () => {
  const graph = buildFlowGraph(all, sources);

  it('makes a node per integration plus one per platform event nobody emits', () => {
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(['audit', 'event:auth|signup|signup', 'notify', 'welcome']);
    const node = graph.nodes.find((entry) => entry.id === 'welcome')!;
    expect(node).toMatchObject({ type: 'integration', name: 'welcome', steps: 3, listeners: 1, active: true });
  });

  it('links an emitter to its listeners and a platform event to the integrations that react to it', () => {
    expect(graph.edges.map((edge) => `${edge.from}>${edge.to}`).sort()).toEqual(['event:auth|signup|signup>welcome', 'welcome>notify']);
  });

  it('links one emitter to every listener and every emitter to a shared listener', () => {
    const fan = buildFlowGraph([make('a', undefined, sig('x')), make('b', undefined, sig('x')), make('c', sig('x')), make('d', sig('x'))], sources);
    expect(fan.edges.map((edge) => `${edge.from}>${edge.to}`).sort()).toEqual(['a>c', 'a>d', 'b>c', 'b>d']);
    expect(fan.nodes.some((node) => node.type === 'event')).toBe(false);
  });

  it('does not let an integration start itself: its own event does not count as a source', () => {
    const loop = buildFlowGraph([make('self', sig('ping'), sig('ping'))], sources);
    expect(loop.edges.map((edge) => `${edge.from}>${edge.to}`)).toEqual(['event:qelos|flow|ping>self']);
    expect(loop.edges.some((edge) => edge.from === edge.to)).toBe(false);
  });

  it('marks inactive integrations', () => {
    const g = buildFlowGraph([make('off', undefined, undefined, { active: false })], sources);
    expect(g.nodes[0]).toMatchObject({ active: false });
  });
});

describe('queries', () => {
  const graph = buildFlowGraph(all, sources);

  it('lists what starts a node and what it starts', () => {
    expect(relationsOf(graph, 'welcome')).toEqual({ triggeredBy: ['event:auth|signup|signup'], triggers: ['notify'] });
    expect(relationsOf(graph, 'audit')).toEqual({ triggeredBy: [], triggers: [] });
  });

  it('finds the whole flow around a node', () => {
    expect([...flowOf(graph, 'notify')].sort()).toEqual(['event:auth|signup|signup', 'notify', 'welcome']);
    expect([...flowOf(graph, 'audit')]).toEqual(['audit']);
  });

  it('finds nodes with no links', () => {
    expect([...standaloneIds(graph)]).toEqual(['audit']);
  });

  it('flags an emitted event that nobody listens to', () => {
    expect(diagnose(graph)).toEqual([{ kind: 'nobody-listens', id: 'notify' }]);
  });

  it('keeps edges only between kept nodes', () => {
    const only = subgraph(graph, (node) => node.id !== 'notify');
    expect(only.nodes.map((node) => node.id)).not.toContain('notify');
    expect(only.edges.map((edge) => edge.id)).toEqual(['event:auth|signup|signup->welcome']);
  });
});

describe('layoutFlow', () => {
  const graph = buildFlowGraph(all, sources);
  const positions = layoutFlow(graph, { columnWidth: 100, rowHeight: 50, gridColumns: 2, gap: 10 });

  it('places each step of a flow one column to the right of what starts it', () => {
    expect(positions['event:auth|signup|signup'].x).toBe(0);
    expect(positions.welcome.x).toBe(100);
    expect(positions.notify.x).toBe(200);
  });

  it('puts unlinked nodes in a grid under the flows', () => {
    expect(positions.audit.x).toBe(0);
    expect(positions.audit.y).toBeGreaterThan(positions.notify.y);
  });

  it('lays out every node exactly once, even with cycles', () => {
    const cyclic = buildFlowGraph([make('a', sig('b.done'), sig('a.done')), make('b', sig('a.done'), sig('b.done'))], sources);
    const result = layoutFlow(cyclic);
    expect(Object.keys(result).sort()).toEqual(['a', 'b']);
  });

  it('orders a layer by where its parents are, so edges stay uncrossed', () => {
    const g = buildFlowGraph(
      [make('p1', undefined, sig('e1')), make('p2', undefined, sig('e2')), make('c2', sig('e2')), make('c1', sig('e1'))],
      sources,
    );
    const p = layoutFlow(g, { columnWidth: 100, rowHeight: 50 });
    expect(p.c1.y).toBe(p.p1.y);
    expect(p.c2.y).toBe(p.p2.y);
  });

  it('lays out an empty graph', () => {
    expect(layoutFlow({ nodes: [], edges: [] })).toEqual({});
  });
});
