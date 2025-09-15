export const isDev = process.env.NODE_ENV !== 'production';
export const mongoUri = process.env.MONGO_URI || 'mongodb://localhost/ai-service'
export const redisUrl = process.env.REDIS_URL || (process.env.REDIS_HOST ? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` : undefined);
export const generalOpenAiToken = process.env.OPEN_AI_TOKEN;
export const generalClaudeAiToken = process.env.CLAUDE_AI_TOKEN; // doesn't exist yet
export const internalServicesSecret = process.env.INTERNAL_SECRET
export const secretsToken = process.env.SECRETS_TOKEN || process.env.AI_SERVICE_SECRET;
export const privilegedEditingRoles = process.env.PRIVILEGED_EDIT_ROLES ? process.env.PRIVILEGED_EDIT_ROLES.split(',') : ['admin'];
export const privilegedViewingRoles = process.env.PRIVILEGED_VIEW_ROLES ? process.env.PRIVILEGED_VIEW_ROLES.split(',') : ['user', 'plugin', 'editor', 'admin'];

export const showLogs = isDev || process.env.SHOW_LOGS