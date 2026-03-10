export const mongoUri = process.env.MONGO_URI || 'mongodb://localhost/qelos';
export const port = process.env.PORT || 9008;
export const privilegedRoles = process.env.PRIVILEGED_ROLES ? process.env.PRIVILEGED_ROLES.split(',') : ['admin'];
export const internalServicesSecret = process.env.INTERNAL_SECRET;
export const showLogs = process.env.NODE_ENV !== 'production' || process.env.SHOW_LOGS;
export const basicTenant = process.env.BASIC_TENANT || '0';
