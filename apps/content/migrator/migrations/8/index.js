const mongoose = require('mongoose')
const { appConfiguration } = require('../../../config')

const Configuration = mongoose.model('Configuration')

const APP_CONFIGS_WITHOUT_COLORS = { key: appConfiguration, metadata: { colorsPalette: { $exists: false } } };

/**
 * update site configuration
 */

/**
 * check if app-configuration doesn't have colorsPalette property
 */
async function check () {
  const hasMissingColorsConfig = await Configuration.countDocuments(APP_CONFIGS_WITHOUT_COLORS)
  return !hasMissingColorsConfig
}

/**
 * migrate relevant db rows to fit the new upgrade
 */
function migrate () {
  console.log('start appConfiguration.metadata.colorsPalette migration')
  return Configuration.aggregate([
    { $match: APP_CONFIGS_WITHOUT_COLORS },
    { $limit: 20 },
    { $project: { _id: 1 } }
  ])
    .then(async (list) => {
      if (!list || !list.length) {
        console.log('No more rows to update.')
        return true
      }

      let row
      console.log('start migration of ' + list.length + ' items')
      for (let i in list) {
        row = list[i]
        console.log('update appConfig: ', row._id)
        await Configuration.collection.updateOne({ _id: row._id },
          {
            $set: { 'metadata.colorsPalette': {} }
          })
      }
      return migrate()
    })
}

/**
 * check if all migration changes done as expected
 */
function verify () {
  return Configuration.countDocuments(APP_CONFIGS_WITHOUT_COLORS).then(count => {
    if (!count) return Promise.resolve()
  })
}

module.exports = {
  check, migrate, verify
}
