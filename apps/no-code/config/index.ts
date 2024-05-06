export const isDev = process.env.NODE_ENV !== 'production';
export const mongoUri = process.env.MONGO_URI || 'mongodb://localhost/no-code-service'
export const redisUrl = process.env.REDIS_URL;
export const internalServicesSecret = process.env.INTERNAL_SECRET
export const privilegedEditingRoles = process.env.PRIVILEGED_EDIT_ROLES ? process.env.PRIVILEGED_EDIT_ROLES.split(',') : ['plugin', 'admin'];
export const privilegedViewingRoles = process.env.PRIVILEGED_VIEW_ROLES ? process.env.PRIVILEGED_VIEW_ROLES.split(',') : ['user', 'plugin', 'editor', 'admin'];

export const showLogs = isDev || process.env.SHOW_LOGS