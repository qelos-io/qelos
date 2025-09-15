const adminRole = process.env.ADMIN_ROLE || 'admin'
const editorsRoles = process.env.EDITORS_ROLES ? process.env.EDITORS_ROLES.split(',') : ['editor', 'plugin', adminRole]

module.exports = {
  port: process.env.PORT || 9001,
  mongoUri: process.env.MONGO_URI || "mongodb://localhost/qelos",
  editorsRoles,
  adminRole,
  appConfiguration: process.env.APP_CONFIGURATION || "app-configuration",
  allowedToChangeWebsiteUrls: process.env.ALLOW_WEBSITE_URLS_CHANGE !== 'false' || true,
  workspaceConfiguration:
    process.env.WORKSPACE_CONFIGURATION || "workspace-configuration",
  ssrScriptsConfiguration: process.env.SSR_SCRIPTS || "ssr-scripts",
  redisUrl: process.env.REDIS_URL || (process.env.REDIS_HOST ? `${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` : undefined),
  basicTenant: process.env.BASIC_TENANT || "0",
};
