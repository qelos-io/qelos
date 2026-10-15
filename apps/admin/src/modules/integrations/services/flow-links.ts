import { emits, listensTo, signatureKey, type EventSignature, type FlowEdge, type FlowIntegration } from './flow-graph';
import { automationName, type SourceLike } from './integration-presentation';

export interface FullIntegration extends FlowIntegration {
  trigger?: { source?: string; operation?: string; details?: Record<string, any> };
  target?: { source?: string; operation?: string; details?: Record<string, any> };
}

/** A change to apply to one integration: only the parts that change are sent. */
export interface IntegrationUpdate {
  id: string;
  body: { trigger?: NonNullable<FullIntegration['trigger']>; target?: NonNullable<FullIntegration['target']> };
}

const slug = (text: string) =>
  text
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'integration';

/** A new event that no integration announces or listens to yet. */
export function generateSignature(name: string, taken: Iterable<EventSignature>, suffix = 'done'): EventSignature {
  const used = new Set([...taken].map(signatureKey));
  const base = slug(name);
  for (let n = 1; ; n++) {
    const candidate: EventSignature = { source: 'integrations', kind: 'flow', eventName: `${base}.${suffix}${n > 1 ? `-${n}` : ''}` };
    if (!used.has(signatureKey(candidate))) return candidate;
  }
}

export const allSignatures = (integrations: FullIntegration[]): EventSignature[] =>
  integrations.flatMap((integration) => [emits(integration), listensTo(integration)].filter((value): value is EventSignature => !!value));

export type LinkRefusal = 'same-node' | 'cannot-listen' | 'already-linked' | 'unknown-node';

export type ConnectPlan =
  | { ok: true; signature: EventSignature; updates: IntegrationUpdate[]; announcesNew: boolean; replaces?: EventSignature }
  | { ok: false; reason: LinkRefusal };

export const announceUpdate = (integration: FullIntegration, signature: EventSignature): IntegrationUpdate => withEmission(integration, signature);

const withEmission = (integration: FullIntegration, signature: EventSignature): IntegrationUpdate => ({
  id: integration._id,
  body: {
    target: {
      ...integration.target,
      details: { ...(integration.target?.details || {}), triggerResponse: { ...(integration.target?.details?.triggerResponse || {}), ...signature, description: integration.target?.details?.triggerResponse?.description ?? '', metadata: integration.target?.details?.triggerResponse?.metadata ?? {} } },
    },
  },
});

const withListening = (integration: FullIntegration, signature: EventSignature): IntegrationUpdate => ({
  id: integration._id,
  body: { trigger: { ...integration.trigger, details: { ...(integration.trigger?.details || {}), ...signature } } },
});

/**
 * What it takes to make `to` start when `from` finishes. `from` is an integration (it announces an event, a new one
 * if it announced none) or a platform event (`event` = its signature). Only integrations with a webhook trigger can
 * listen, because that is the one trigger that waits for an event.
 */
export function planConnect(
  integrations: FullIntegration[],
  from: { integrationId: string } | { event: EventSignature },
  toId: string,
  sources: Record<string, SourceLike>,
): ConnectPlan {
  const to = integrations.find((integration) => integration._id === toId);
  if (!to) return { ok: false, reason: 'unknown-node' };
  if ('integrationId' in from && from.integrationId === toId) return { ok: false, reason: 'same-node' };
  if (to.trigger?.operation !== 'webhook') return { ok: false, reason: 'cannot-listen' };

  const updates: IntegrationUpdate[] = [];
  let signature: EventSignature;
  let announcesNew = false;

  if ('event' in from) {
    signature = from.event;
  } else {
    const source = integrations.find((integration) => integration._id === from.integrationId);
    if (!source) return { ok: false, reason: 'unknown-node' };
    const announced = emits(source);
    signature = announced ?? generateSignature(automationName(source, sources), allSignatures(integrations));
    if (!announced) {
      announcesNew = true;
      updates.push(withEmission(source, signature));
    }
  }

  const listening = listensTo(to);
  if (listening && signatureKey(listening) === signatureKey(signature)) return { ok: false, reason: 'already-linked' };
  updates.push(withListening(to, signature));

  return { ok: true, signature, updates, announcesNew, ...(listening ? { replaces: listening } : {}) };
}

/**
 * Unlinks one edge by pointing the listener at a fresh event of its own. The trigger has to keep a complete
 * signature (the server requires one), so "disconnected" means "waiting for an event nothing sends".
 */
export function planDisconnect(integrations: FullIntegration[], edge: Pick<FlowEdge, 'to'>, sources: Record<string, SourceLike>): { updates: IntegrationUpdate[]; signature: EventSignature } | null {
  const listener = integrations.find((integration) => integration._id === edge.to);
  if (!listener || listener.trigger?.operation !== 'webhook') return null;
  const signature = generateSignature(automationName(listener, sources), allSignatures(integrations), 'trigger');
  return { updates: [withListening(listener, signature)], signature };
}

/** Applies updates to a copy of the integrations, so a plan can be previewed or tested without a server. */
export function applyUpdates(integrations: FullIntegration[], updates: IntegrationUpdate[]): FullIntegration[] {
  return integrations.map((integration) => {
    const update = updates.find((entry) => entry.id === integration._id);
    return update ? { ...integration, ...update.body } : integration;
  });
}

/** The parts of an integration an update touches, as they are now: what to send to undo it. */
export function inverseUpdates(integrations: FullIntegration[], updates: IntegrationUpdate[]): IntegrationUpdate[] {
  return updates.map((update) => {
    const current = integrations.find((integration) => integration._id === update.id)!;
    return {
      id: update.id,
      body: {
        ...(update.body.trigger ? { trigger: JSON.parse(JSON.stringify(current.trigger)) } : {}),
        ...(update.body.target ? { target: JSON.parse(JSON.stringify(current.target)) } : {}),
      },
    };
  });
}

/** The trigger a new integration needs to start right after the given event. */
export function triggerFor(qelosSourceId: string, signature: EventSignature, name = '') {
  return { source: qelosSourceId, operation: 'webhook', details: { ...(name ? { name } : {}), ...signature } };
}
