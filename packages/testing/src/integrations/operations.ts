/**
 * What an integration's trigger and target may be, by the kind of their connection:
 * `apps/plugins/server/services/integrations-{trigger,target}-service.ts`.
 */

interface Details {
  required: string[];
  optional: string[];
}
type Operations = Record<string, Record<string, Details>>;

const details = (required: string[] = [], optional: string[] = []): Details => ({ required, optional });

const MODEL_SETTINGS = ['pre_messages', 'model', 'temperature', 'max_tokens', 'top_p', 'frequency_penalty', 'presence_penalty', 'stop', 'response_format', 'embeddingType', 'maxTools', 'ingestedBlueprints', 'ingestedAgents'];
const FUNCTION_SETTINGS = details(['name', 'runtime'], ['description', 'timeout', 'memorySize', 'role', 'handler', 'zipFile', 'code', 'entryPoint', 'bindings']);
const FUNCTION_PROVIDER = {
  callFunction: details(['name'], ['payload']),
  getFunction: details(['name']),
  createFunction: FUNCTION_SETTINGS,
  listFunctions: details(),
  updateFunction: FUNCTION_SETTINGS,
};

const TRIGGERS: Operations = {
  qelos: {
    webhook: details(['source', 'kind', 'eventName']),
    chatCompletion: details([], ['recordThread', 'name', 'description', 'vectorStore', 'vectorStoreScope', 'vectorStoreExpirationDays', 'vectorStoreHardcodedIds', 'webSearch', 'codeInterpreter', 'rules']),
    apiWebhook: details([], ['name']),
    mcpTool: details(['name', 'description'], ['parameters']),
  },
  openai: {
    functionCalling: details(['name', 'description'], ['allowedIntegrationIds', 'blockedIntegrationIds', 'parameters']),
  },
};

const TARGETS: Operations = {
  qelos: {
    webhook: details(['source', 'kind', 'eventName']),
    createUser: details([], ['password', 'roles']),
    updateUser: details([], ['userId', 'password', 'roles']),
    setUserRoles: details([], ['userId', 'roles']),
    setWorkspaceLabels: details([], ['workspaceId', 'labels']),
    createBlueprintEntity: details([], ['blueprint', 'metadata']),
    updateBlueprintEntity: details([], ['blueprint', 'metadata']),
    chatCompletion: details(['integrationId']),
  },
  openai: {
    chatCompletion: details([], MODEL_SETTINGS),
    uploadContentToStorage: details(['content'], ['vectorStoreId', 'fileName', 'metadata']),
    clearStorageFiles: details([], ['vectorStoreId', 'fileIds']),
  },
  claudeai: { chatCompletion: details([], ['system', 'stop_sequences', ...MODEL_SETTINGS]) },
  http: { makeRequest: details([], ['headers', 'body', 'query', 'method', 'url']) },
  email: { sendEmail: details([], ['to', 'subject', 'body', 'cc', 'bcc']) },
  aws: FUNCTION_PROVIDER,
  cloudflare: FUNCTION_PROVIDER,
};

const COMMON = { trigger: ['roles', 'workspaceRoles', 'workspaceLabels'], target: ['triggerResponse'] };

export type Side = 'trigger' | 'target';
export interface IntegrationEnd {
  source?: string;
  operation?: string;
  details?: Record<string, unknown>;
}

/**
 * One end of an integration as it is saved (details its operation does not know are dropped), or why it is refused.
 * `kindOf` answers the kind of a connection, or undefined when there is no such connection.
 */
export function checkEnd(
  side: Side,
  end: IntegrationEnd,
  kindOf: (source: string) => string | undefined,
): { error: string } | { kind: string; end: Required<IntegrationEnd> } {
  const trigger = side === 'trigger';
  const { source, operation } = end ?? {};
  if (!source || !operation) return { error: `missing ${side} source or operation` };
  const kind = kindOf(source);
  // the service capitalises these differently for triggers and targets
  if (!kind) return { error: `${trigger ? 'Target' : 'target'} source not found` };
  const operations = (trigger ? TRIGGERS : TARGETS)[kind];
  if (!trigger && !operations) return { error: 'unsupported target source kind' };
  const wanted = operations?.[operation];
  const name = trigger ? 'Operation' : 'operation';
  if (!wanted) return { error: `${name} ${operation} does not exist on source of kind ${kind}` };
  const given = end.details ?? {};
  if (!wanted.required.every((key) => ['string', 'number', 'boolean'].includes(typeof given[key]))) {
    return { error: `${name} ${operation} must contain relevant details: ${wanted.required.join(',')}` };
  }
  const known = [...wanted.required, ...wanted.optional, ...COMMON[side]];
  const kept = Object.fromEntries(Object.entries(given).filter(([key]) => known.includes(key)));
  return { kind, end: { source, operation, details: kept } };
}
