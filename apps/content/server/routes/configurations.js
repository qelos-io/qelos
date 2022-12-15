module.exports = function (app) {
  const populateUser = require('../middleware/populate-user')
  const { onlyAdmin } = require('../middleware/auth-check')

  const {
    getConfigurationsList,
    getConfigurationByKey,
    getConfiguration,
    updateConfiguration,
    getTenantByHost,
    createConfiguration,
    removeConfiguration,
  } = require('../controllers/configurations')

  // configurations routes
  app
    .get('/api/configurations', populateUser, onlyAdmin, getConfigurationsList) // only admin can get ALL menus names
    .get('/api/configurations/:configKey', populateUser, getConfigurationByKey, getConfiguration)
    .put('/api/configurations/:configKey', populateUser, onlyAdmin, getConfigurationByKey, updateConfiguration)
    .delete('/api/configurations/:configKey', populateUser, onlyAdmin, getConfigurationByKey, removeConfiguration)
    .post('/api/configurations', populateUser, onlyAdmin, createConfiguration)

  app.get('/internal-api/host-tenant', getTenantByHost)
}
