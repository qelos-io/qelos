const mongoose = require('mongoose')
const Configuration = mongoose.model('Configuration')
const { MIGRATION_KEY } = require('./consts')

function getCurrentMigrationHandler () {
  return Configuration.findOne({ key: MIGRATION_KEY }).lean()
}

function clearCurrentMigrationHandler () {
  console.log('clear current migration handler');
  return Configuration.updateOne({ key: MIGRATION_KEY }, {
    $set: {
      metadata: {
        isMigrationRunning: false,
        handler: null
      }
    }
  })
}

module.exports = {
  getCurrentMigrationHandler,
  clearCurrentMigrationHandler
}
