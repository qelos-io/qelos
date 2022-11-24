const editorsRoles = process.env.EDITORS_ROLES ? process.env.EDITORS_ROLES.split(',') : ['editor', 'admin']

module.exports = {
  dev: process.env.NODE_ENV !== 'production',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost/assets-service',
  internalServicesSecret: process.env.INTERNAL_SECRET,
  secretsToken: process.env.ASSETS_SERVICE_SECRET || process.env.SECRETS_TOKEN,
  editorsRoles,
}
