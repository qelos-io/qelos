const mongoose = require('mongoose')
const MAIN_TENANT = process.env.MAIN_TENANT || '0'

const Configuration = mongoose.model('Configuration')

/**
 * create open ai configuration
 */

/**
 * check potential changes to migrate
 */
async function check() {
  const hasConfig = await Configuration.countDocuments({ key: 'global-ai-configuration' })
  return !hasConfig
}

/**
 * migrate relevant db rows to fit the new upgrade
 */
function migrate() {
  const row = new Configuration({
    tenant: MAIN_TENANT,
    key: 'global-ai-configuration',
    public: false,
    metadata: {
      monthlyPromptsPerTenant: 5,
      systemPrompts: {
        generateBlueprints: '',
        generateScreens: '',
        eachBlueprint: '',
        eachScreen: ''
      },
    }
  })
  return row.save()
}

/**
 * check if all migration changes done as expected
 */
function verify() {
  return Configuration.countDocuments({ key: 'global-ai-configuration' }).then(count => {
    if (!count) return Promise.reject()
  })
}

module.exports = {
  check, migrate, verify
}
