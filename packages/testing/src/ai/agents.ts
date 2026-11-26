import type { Doc } from '../state/mock-state.js';
import { isSignedIn, type MockActor } from '../routes/actor.js';

/** Agents as `apps/ai` shapes them (`agent-integration-mapping.ts`), and who may use one (`source-service.ts`). */

const defined = <T>(...values: T[]) => values.find((v) => v !== undefined);

/** An agent as the API returns it, from a seeded integration (`trigger` / `target`) or a seeded flat agent. */
export function toAgent(doc: Doc) {
  const trigger = doc.trigger?.details ?? {};
  const target = doc.target?.details ?? {};
  return {
    _id: doc._id,
    name: defined(trigger.name, doc.name) ?? '',
    model: defined(target.model, doc.model) ?? '',
    systemPrompt: defined(trigger.systemPrompt, doc.systemPrompt) ?? '',
    tools: defined(trigger.tools, doc.tools) ?? [],
    temperature: defined(target.temperature, doc.temperature),
    maxTokens: defined(target.max_tokens, doc.maxTokens),
    tenant: doc.tenant,
    workspace: defined(trigger.workspace, doc.workspace),
    triggerSource: defined(doc.trigger?.source, doc.triggerSource),
    targetSource: defined(doc.target?.source, doc.targetSource),
    active: doc.active !== false,
    created: doc.created,
  };
}

const set = (target: Record<string, any>, values: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(values)) if (value !== undefined) target[key] = value;
  return target;
};

/** The integration an agent payload is stored as, on top of the existing one when updating. */
export function agentIntegration(payload: Record<string, any>, existing?: Doc) {
  const { name, systemPrompt, tools, workspace, model, temperature, maxTokens, triggerSource, targetSource } = payload;
  return {
    trigger: {
      source: triggerSource || existing?.trigger?.source,
      operation: 'chatCompletion',
      details: set({ ...existing?.trigger?.details }, { name, systemPrompt, tools, workspace }),
    },
    target: {
      source: targetSource || existing?.target?.source,
      operation: 'chatCompletion',
      details: set({ ...existing?.target?.details }, { model, temperature, max_tokens: maxTokens }),
    },
  };
}

const list = (value: unknown): string[] => (!value ? [] : ([] as string[]).concat(value as string | string[]));
const hasMatch = (required: string[], actual: string[]) =>
  !required.length || required.includes('*') || required.some((role) => actual.includes(role));

/**
 * Why the caller may not chat with the agent, or undefined when they may. A guest needs the agent to list the
 * `guest` role. Not checked without a caller, or for an agent the mock does not know.
 */
export function agentRefusal(actor: MockActor | null, agent: Doc | undefined): string | undefined {
  if (!actor || !agent) return undefined;
  const details = agent.trigger?.details ?? {};
  const roles = list(details.roles);
  if (!isSignedIn(actor)) return roles.includes('guest') ? undefined : 'Guest access is not allowed';
  if (!hasMatch(roles.filter((r) => r !== 'guest'), list(actor.roles))) return 'User does not have required roles';
  if (!hasMatch(list(details.workspaceRoles), list(actor.workspace?.roles))) return 'User does not have required workspace roles';
  if (!hasMatch(list(details.workspaceLabels), list(actor.workspace?.labels))) return 'User does not have required workspace labels';
  return undefined;
}
