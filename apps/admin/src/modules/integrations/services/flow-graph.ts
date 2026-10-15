import { classifyAutomation, automationName, type AutomationLike, type AutomationType, type SourceLike } from './integration-presentation';

/** The three parts that identify a platform event. */
export interface EventSignature {
  source: string;
  kind: string;
  eventName: string;
}

export interface FlowIntegration extends AutomationLike {
  _id: string;
  dataManipulation?: unknown[];
  targetManipulation?: unknown[];
}

export interface IntegrationNodeData {
  type: 'integration';
  id: string;
  name: string;
  automationType: AutomationType;
  active: boolean;
  trigger: { source: string; operation: string; event?: EventSignature };
  target: { source: string; operation: string };
  steps: number;
  /** the event it emits when its target succeeds */
  emits?: EventSignature;
  /** how many integrations listen to what it emits */
  listeners: number;
  /** the first logo kind of each end, for the card icons */
  kinds: [string, string];
}

export interface EventNodeData {
  type: 'event';
  id: string;
  signature: EventSignature;
  /** integrations that listen to this event */
  listeners: number;
}

export type FlowNodeData = IntegrationNodeData | EventNodeData;

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  signature: EventSignature;
}

export interface FlowGraph {
  nodes: FlowNodeData[];
  edges: FlowEdge[];
}

const isComplete = (value?: Partial<EventSignature> | null): value is EventSignature => !!(value?.source && value?.kind && value?.eventName);

export const signatureKey = (signature: EventSignature) => `${signature.source}|${signature.kind}|${signature.eventName}`;

export const signatureLabel = (signature: EventSignature) => `${signature.source} · ${signature.kind} · ${signature.eventName}`;

const signatureOf = (value?: Record<string, any> | null): EventSignature | undefined =>
  isComplete({ source: value?.source, kind: value?.kind, eventName: value?.eventName })
    ? { source: value!.source, kind: value!.kind, eventName: value!.eventName }
    : undefined;

/** The event an integration listens to: only a webhook trigger with a full signature. */
export function listensTo(integration: AutomationLike): EventSignature | undefined {
  return integration.trigger?.operation === 'webhook' ? signatureOf(integration.trigger.details) : undefined;
}

/** The event an integration broadcasts when its target succeeds. */
export function emits(integration: AutomationLike): EventSignature | undefined {
  return signatureOf(integration.target?.details?.triggerResponse);
}

export const eventNodeId = (signature: EventSignature) => `event:${signatureKey(signature)}`;

/**
 * Turns the integrations into a flow: every integration is a node, and an integration that broadcasts an event is
 * linked to every integration that listens for it. Events that something listens to but no integration broadcasts
 * (platform events such as a signup) get a node of their own, so a flow always has a visible starting point.
 */
export function buildFlowGraph(integrations: FlowIntegration[], sources: Record<string, SourceLike>): FlowGraph {
  const emitters = new Map<string, FlowIntegration[]>();
  for (const integration of integrations) {
    const signature = emits(integration);
    if (signature) emitters.set(signatureKey(signature), [...(emitters.get(signatureKey(signature)) || []), integration]);
  }

  const listenersOf = new Map<string, FlowIntegration[]>();
  for (const integration of integrations) {
    const signature = listensTo(integration);
    if (signature) listenersOf.set(signatureKey(signature), [...(listenersOf.get(signatureKey(signature)) || []), integration]);
  }

  const nodes: FlowNodeData[] = integrations.map((integration) => {
    const emitted = emits(integration);
    const heard = listensTo(integration);
    return {
      type: 'integration',
      id: integration._id,
      name: automationName(integration, sources),
      automationType: classifyAutomation(integration),
      active: integration.active !== false,
      trigger: { source: sources[integration.trigger?.source || '']?.name || '', operation: integration.trigger?.operation || '', event: heard },
      target: { source: sources[integration.target?.source || '']?.name || '', operation: integration.target?.operation || '' },
      steps: (integration.dataManipulation?.length || 0) + (integration.targetManipulation?.length || 0),
      emits: emitted,
      listeners: emitted ? (listenersOf.get(signatureKey(emitted)) || []).filter((listener) => listener._id !== integration._id).length : 0,
      kinds: [integration.kind?.[0] || '', integration.kind?.[1] || ''],
    };
  });

  const edges: FlowEdge[] = [];
  const eventNodes = new Map<string, EventNodeData>();

  for (const [key, listeners] of listenersOf) {
    const signature = signatureOf(listeners[0].trigger!.details)!;
    for (const listener of listeners) {
      // what can start this listener: any other integration that emits the event
      const producers = (emitters.get(key) || []).filter((producer) => producer._id !== listener._id);
      if (producers.length) {
        for (const producer of producers) edges.push({ id: `${producer._id}->${listener._id}:${key}`, from: producer._id, to: listener._id, signature });
        continue;
      }
      // nothing in the app emits it: it comes from the platform or another service
      const id = eventNodeId(signature);
      const known = eventNodes.get(id) || { type: 'event' as const, id, signature, listeners: 0 };
      known.listeners++;
      eventNodes.set(id, known);
      edges.push({ id: `${id}->${listener._id}`, from: id, to: listener._id, signature });
    }
  }

  return { nodes: [...nodes, ...eventNodes.values()], edges };
}

export interface Relations {
  /** nodes that start this one */
  triggeredBy: string[];
  /** nodes this one starts */
  triggers: string[];
}

export function relationsOf(graph: FlowGraph, id: string): Relations {
  return {
    triggeredBy: graph.edges.filter((edge) => edge.to === id).map((edge) => edge.from),
    triggers: graph.edges.filter((edge) => edge.from === id).map((edge) => edge.to),
  };
}

/** Every node that can be reached by following edges forwards or backwards: the whole flow a node belongs to. */
export function flowOf(graph: FlowGraph, id: string): Set<string> {
  const neighbours = new Map<string, string[]>();
  for (const edge of graph.edges) {
    neighbours.set(edge.from, [...(neighbours.get(edge.from) || []), edge.to]);
    neighbours.set(edge.to, [...(neighbours.get(edge.to) || []), edge.from]);
  }
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    for (const next of neighbours.get(queue.shift()!) || []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

/** Nodes that take part in no link at all. */
export function standaloneIds(graph: FlowGraph): Set<string> {
  const linked = new Set(graph.edges.flatMap((edge) => [edge.from, edge.to]));
  return new Set(graph.nodes.filter((node) => !linked.has(node.id)).map((node) => node.id));
}

export type Diagnostic = { kind: 'nobody-listens' | 'no-event'; id: string };

/** Things worth a second look on the canvas: an emitted event nobody listens to. */
export function diagnose(graph: FlowGraph): Diagnostic[] {
  return graph.nodes.flatMap<Diagnostic>((node) => (node.type === 'integration' && node.emits && node.listeners === 0 ? [{ kind: 'nobody-listens', id: node.id }] : []));
}

/** Keeps the nodes that pass `keep` and every edge between two kept nodes. */
export function subgraph(graph: FlowGraph, keep: (node: FlowNodeData) => boolean): FlowGraph {
  const nodes = graph.nodes.filter(keep);
  const ids = new Set(nodes.map((node) => node.id));
  return { nodes, edges: graph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)) };
}
