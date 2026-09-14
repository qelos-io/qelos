const editorsRoles = process.env.EDITORS_ROLES ? process.env.EDITORS_ROLES.split(',') : ['editor', 'admin']

const isDev = process.env.NODE_ENV !== 'production';

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 50 * 1024 * 1024; // 50MB default

module.exports = {
  dev: isDev,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost/assets-service',
  internalServicesSecret: process.env.INTERNAL_SECRET,
  secretsToken: process.env.ASSETS_SERVICE_SECRET || process.env.SECRETS_TOKEN,
  editorsRoles,
  showLogs: isDev || process.env.SHOW_LOGS === 'true',
  maxFileSize,
}
