
module.exports = function (app) {
  const populateUser = require('../middleware/populate-user')
  const { onlyAdmin } = require('../middleware/auth-check')

  const { basicTenant } = require('../../config')

  const {
    getConfigurationsList,
    getConfiguration,
    updateConfiguration,
    createConfiguration,
    removeConfiguration,
  } = require('../controllers/tenants-configurations')

  function onlyMainTenant(req, res, next) {
    if (req.headers.tenant === basicTenant) {
      next()
    } else {
      res.status(403).json({ message: 'not permitted' }).end()
    }
  }

  app
    .get('/api/tenants-configurations', onlyMainTenant, populateUser, onlyAdmin, getConfigurationsList)
    .get('/api/tenants-configurations/:tenant/:configKey', onlyMainTenant, populateUser, onlyAdmin, getConfiguration)
    .put('/api/tenants-configurations/:tenant/:configKey', onlyMainTenant, populateUser, onlyAdmin, updateConfiguration)
    .delete('/api/tenants-configurations/:tenant/:configKey', onlyMainTenant, populateUser, onlyAdmin, removeConfiguration)
    .post('/api/tenants-configurations', onlyMainTenant, populateUser, onlyAdmin, createConfiguration)
}
