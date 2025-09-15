
module.exports = function (app) {
  const { verifyInternalCall } = require('@qelos/api-kit')
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
    .get('/api/configurations', populateUser, onlyAdmin, getConfigurationsList)
    .get('/api/configurations/:configKey', populateUser, getConfigurationByKey, getConfiguration)
    .put('/api/configurations/:configKey', populateUser, onlyAdmin, updateConfiguration)
    .delete('/api/configurations/:configKey', populateUser, onlyAdmin, removeConfiguration)
    .post('/api/configurations', populateUser, onlyAdmin, createConfiguration)

  app.get('/internal-api/host-tenant', getTenantByHost)
  app.get('/internal-api/configurations/:configKey', verifyInternalCall, getConfigurationByKey, getConfiguration)
}
1