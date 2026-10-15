export type AutomationType = 'ai-agent' | 'function-call' | 'mcp-tool' | 'api-webhook' | 'webhook' | 'workflow';

export interface AutomationLike {
  _id?: string;
  active?: boolean;
  kind?: string[];
  trigger?: { source?: string; operation?: string; details?: Record<string, any> };
  target?: { source?: string; operation?: string; details?: Record<string, any> };
}

export interface SourceLike {
  _id: string;
  name?: string;
  kind?: string;
}

export const AUTOMATION_TYPES: { key: AutomationType; label: string; description: string }[] = [
  { key: 'ai-agent', label: 'AI agents', description: 'Conversational agents with tools' },
  { key: 'mcp-tool', label: 'MCP tools', description: 'Tools exposed to MCP clients' },
  { key: 'function-call', label: 'Function calls', description: 'Functions an agent can call' },
  { key: 'api-webhook', label: 'API webhooks', description: 'Endpoints other apps call' },
  { key: 'webhook', label: 'Webhooks', description: 'Reactions to events from other services' },
  { key: 'workflow', label: 'Workflows', description: 'Everything else' },
];

/** What an automation is for, from its trigger. Anything that is none of the named kinds is a plain workflow. */
export function classifyAutomation(automation: AutomationLike): AutomationType {
  const operation = automation.trigger?.operation;
  const fromQelos = automation.kind?.[0] === 'qelos';
  if (fromQelos && operation === 'chatCompletion') return 'ai-agent';
  if (operation === 'functionCalling') return 'function-call';
  if (fromQelos && operation === 'mcpTool') return 'mcp-tool';
  if (fromQelos && operation === 'apiWebhook') return 'api-webhook';
  if (operation === 'webhook' && automation.trigger?.details?.source) return 'webhook';
  return 'workflow';
}

const sourceName = (id: string | undefined, sources: Record<string, SourceLike>) => (id && sources[id]?.name) || '';

/** The name people gave it, else "from → to". */
export function automationName(automation: AutomationLike, sources: Record<string, SourceLike>): string {
  const given = automation.trigger?.details?.name;
  if (given) return String(given);
  const from = sourceName(automation.trigger?.source, sources);
  const to = sourceName(automation.target?.source, sources);
  return [from, to].filter(Boolean).join(' → ') || automation._id || '';
}

export interface FlowEnd {
  source: string;
  kind: string;
  operation: string;
}

export function automationFlow(automation: AutomationLike, sources: Record<string, SourceLike>): { from: FlowEnd; to: FlowEnd } {
  return {
    from: { source: sourceName(automation.trigger?.source, sources), kind: automation.kind?.[0] || '', operation: automation.trigger?.operation || '' },
    to: { source: sourceName(automation.target?.source, sources), kind: automation.kind?.[1] || '', operation: automation.target?.operation || '' },
  };
}

/** A one-line description for the row, when the automation carries one. */
export function automationDescription(automation: AutomationLike): string {
  const details = automation.trigger?.details || {};
  if (automation.trigger?.operation === 'webhook') {
    return [details.kind, details.eventName ? `Event: ${details.eventName}` : ''].filter(Boolean).join(' | ');
  }
  return details.description ? String(details.description) : '';
}

const normalize = (value: unknown) => String(value ?? '').toLocaleLowerCase();

export function matchesAutomation(automation: AutomationLike, query: string, sources: Record<string, SourceLike>): boolean {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = normalize(
    [
      automationName(automation, sources),
      sourceName(automation.trigger?.source, sources),
      sourceName(automation.target?.source, sources),
      automation.trigger?.operation,
      automation.target?.operation,
      automation.trigger?.details?.description,
      automation.target?.details?.name,
      automation.kind?.join(' '),
      automation._id,
    ].join(' '),
  );
  return words.every((word) => haystack.includes(word));
}

export type StateFilter = 'all' | 'active' | 'inactive';

export interface AutomationFilter {
  type?: AutomationType | 'all';
  state?: StateFilter;
  query?: string;
}

export function filterAutomations<T extends AutomationLike>(list: T[], filter: AutomationFilter, sources: Record<string, SourceLike>): T[] {
  return list.filter((automation) => {
    if (filter.type && filter.type !== 'all' && classifyAutomation(automation) !== filter.type) return false;
    const active = automation.active !== false;
    if (filter.state === 'active' && !active) return false;
    if (filter.state === 'inactive' && active) return false;
    return matchesAutomation(automation, filter.query || '', sources);
  });
}

export function countByType(list: AutomationLike[]): Record<AutomationType | 'all', number> {
  const counts: Record<string, number> = { all: list.length };
  for (const type of AUTOMATION_TYPES) counts[type.key] = 0;
  for (const automation of list) counts[classifyAutomation(automation)]++;
  return counts as Record<AutomationType | 'all', number>;
}

/** A copy of an automation that can be saved as a new one. */
export function cloneForCreate<T extends Record<string, any>>(automation: T): T {
  const copy = JSON.parse(JSON.stringify(automation));
  for (const key of ['_id', 'created', 'updated', 'tenant', '__v']) delete copy[key];
  if (copy.trigger?.details?.name) copy.trigger.details.name = `${copy.trigger.details.name}_COPY`;
  delete copy.trigger?._id;
  delete copy.target?._id;
  for (const row of [...(copy.dataManipulation || []), ...(copy.targetManipulation || [])]) delete row._id;
  return copy;
}

export type RouteQuery = Record<string, string | string[] | null | undefined>;

const first = (value: RouteQuery[string]) => (Array.isArray(value) ? value[0] : value) ?? undefined;

/**
 * Old links opened the editor as a dialog through ?mode=edit&id=… or ?mode=create. The editor is a page now;
 * this maps such a query to its location so those links keep working. Returns null for any other query.
 */
export function legacyEditorLocation(query: RouteQuery): { name: string; params?: Record<string, string>; query?: Record<string, string> } | null {
  const mode = first(query.mode);
  if (mode === 'edit') {
    const id = first(query.id);
    return id ? { name: 'integration-edit', params: { integrationId: id } } : null;
  }
  if (mode !== 'create') return null;
  const next: Record<string, string> = { type: first(query.agentMode) === 'true' || first(query.type) === 'agent' ? 'agent' : 'workflow' };
  if (first(query.clone) === 'true') next.clone = 'true';
  const sourceId = first(query.sourceId);
  if (sourceId) next.sourceId = sourceId;
  return { name: 'integration-new', query: next };
}
