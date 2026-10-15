import { describe, expect, it } from 'vitest';
import { applyUpdates, generateSignature, inverseUpdates, planConnect, planDisconnect, triggerFor, type FullIntegration } from '../flow-links';
import { buildFlowGraph, signatureKey } from '../flow-graph';

const sources = { q: { _id: 'q', name: 'Qelos' } };
const sig = (eventName: string) => ({ source: 'qelos', kind: 'flow', eventName });

const make = (id: string, name: string, opts: { listen?: ReturnType<typeof sig>; emit?: ReturnType<typeof sig>; operation?: string } = {}): FullIntegration => ({
  _id: id,
  active: true,
  kind: ['qelos', 'qelos'],
  trigger: { source: 'q', operation: opts.operation ?? (opts.listen ? 'webhook' : 'webhook'), details: { name, ...(opts.listen || {}) } },
  target: { source: 'q', operation: 'webhook', details: opts.emit ? { triggerResponse: { ...opts.emit, description: '', metadata: {} } } : { other: 1 } },
});

describe('generateSignature', () => {
  it('slugs the name and avoids taken events', () => {
    expect(generateSignature('Welcome Email!', [])).toEqual({ source: 'integrations', kind: 'flow', eventName: 'welcome-email.done' });
    expect(generateSignature('Welcome Email!', [{ source: 'integrations', kind: 'flow', eventName: 'welcome-email.done' }]).eventName).toBe('welcome-email.done-2');
    expect(generateSignature('  ', []).eventName).toBe('integration.done');
  });
});

describe('planConnect', () => {
  const a = make('a', 'Alpha');
  const b = make('b', 'Beta', { listen: sig('old') });

  it('makes the source announce a new event and the listener wait for it', () => {
    const plan = planConnect([a, b], { integrationId: 'a' }, 'b', sources);
    if (!plan.ok) throw new Error('expected a plan');
    expect(plan.announcesNew).toBe(true);
    expect(plan.signature.eventName).toBe('alpha.done');
    expect(plan.replaces).toEqual(sig('old'));
    const [first, second] = plan.updates;
    expect(first.id).toBe('a');
    expect(first.body.target?.details?.triggerResponse).toMatchObject({ eventName: 'alpha.done' });
    expect(first.body.target?.details?.other).toBe(1); // the rest of the target is kept
    expect(second.id).toBe('b');
    expect(second.body.trigger?.details).toMatchObject({ name: 'Beta', eventName: 'alpha.done' }); // so is the name
  });

  it('reuses the event the source already announces', () => {
    const announcing = make('a', 'Alpha', { emit: sig('alpha.sent') });
    const plan = planConnect([announcing, b], { integrationId: 'a' }, 'b', sources);
    if (!plan.ok) throw new Error('expected a plan');
    expect(plan.announcesNew).toBe(false);
    expect(plan.updates.map((update) => update.id)).toEqual(['b']);
    expect(plan.signature.eventName).toBe('alpha.sent');
  });

  it('connects a platform event straight to a listener', () => {
    const plan = planConnect([a, b], { event: sig('signup') }, 'b', sources);
    if (!plan.ok) throw new Error('expected a plan');
    expect(plan.updates.map((update) => update.id)).toEqual(['b']);
  });

  it('refuses links that cannot work', () => {
    expect(planConnect([a, b], { integrationId: 'a' }, 'a', sources)).toEqual({ ok: false, reason: 'same-node' });
    const agent = make('agent', 'Agent', { operation: 'chatCompletion' });
    expect(planConnect([a, agent], { integrationId: 'a' }, 'agent', sources)).toEqual({ ok: false, reason: 'cannot-listen' });
    expect(planConnect([a, b], { integrationId: 'a' }, 'missing', sources)).toEqual({ ok: false, reason: 'unknown-node' });
    const linked = make('b2', 'Beta', { listen: sig('alpha.sent') });
    expect(planConnect([make('a', 'Alpha', { emit: sig('alpha.sent') }), linked], { integrationId: 'a' }, 'b2', sources)).toEqual({ ok: false, reason: 'already-linked' });
  });

  it('produces a graph where the new link shows up', () => {
    const plan = planConnect([a, b], { integrationId: 'a' }, 'b', sources);
    if (!plan.ok) throw new Error('expected a plan');
    const graph = buildFlowGraph(applyUpdates([a, b], plan.updates), sources);
    expect(graph.edges.map((edge) => `${edge.from}>${edge.to}`)).toEqual(['a>b']);
  });
});

describe('planDisconnect and undo', () => {
  const a = make('a', 'Alpha', { emit: sig('alpha.sent') });
  const b = make('b', 'Beta', { listen: sig('alpha.sent') });
  const c = make('c', 'Gamma', { listen: sig('alpha.sent') });

  it('points only that listener at a fresh event, leaving the other listeners linked', () => {
    const plan = planDisconnect([a, b, c], { to: 'b' }, sources)!;
    expect(plan.updates.map((update) => update.id)).toEqual(['b']);
    expect(signatureKey(plan.signature)).toBe('integrations|flow|beta.trigger');
    const graph = buildFlowGraph(applyUpdates([a, b, c], plan.updates), sources);
    expect(graph.edges.filter((edge) => edge.from === 'a').map((edge) => edge.to)).toEqual(['c']);
  });

  it('cannot unlink something that is not waiting for an event', () => {
    expect(planDisconnect([a, make('x', 'X', { operation: 'mcpTool' })], { to: 'x' }, sources)).toBeNull();
    expect(planDisconnect([a], { to: 'nope' }, sources)).toBeNull();
  });

  it('builds the update that puts things back', () => {
    const plan = planConnect([make('a', 'Alpha'), b], { integrationId: 'a' }, 'b', sources);
    if (!plan.ok) throw new Error('expected a plan');
    const undo = inverseUpdates([make('a', 'Alpha'), b], plan.updates);
    expect(undo.find((update) => update.id === 'b')!.body.trigger?.details?.eventName).toBe('alpha.sent');
    expect(undo.find((update) => update.id === 'a')!.body.target?.details?.triggerResponse).toBeUndefined();
  });
});

describe('triggerFor', () => {
  it('builds a webhook trigger on the given event', () => {
    expect(triggerFor('qid', sig('x'), 'New')).toEqual({ source: 'qid', operation: 'webhook', details: { name: 'New', ...sig('x') } });
    expect(triggerFor('qid', sig('x')).details).not.toHaveProperty('name');
  });
});
