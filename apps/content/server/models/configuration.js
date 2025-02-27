const mongoose = require('mongoose')
const cacheManager = require('../utils/cache-manager')

const cachePrefix = 'configuration:';

const FOREVER_TTL = 9999999999;

// define the model schema
const Configuration = new mongoose.Schema({
  tenant: {
    type: String,
    required: true,
  },
  // configuration name
  key: {
    type: String,
    required: true,
  },
  // is public to see - like site configuration, or not public, like services versions..
  public: {
    type: Boolean,
    default: () => true,
  },
  description: String,
  kind: String,
  // the internal configuration object - can be whatever you want.
  metadata: mongoose.SchemaTypes.Mixed,
  created: {
    type: Date,
    default: Date.now
  }
}, { collection: 'configurations' })

Configuration.index({ tenant: 1, key: 1 }, { unique: true });

Configuration.statics.getForEdit = function (tenant, key) {
  return this.findOne({ key, tenant });
}

Configuration.statics.clearCache = function (tenant, key) {
  const publicKey = cachePrefix + tenant + ':' + key;
  const adminKey = cachePrefix + tenant + ':admin:' + key;
  cacheManager.setItem(publicKey, '', { ttl: 1 }).catch()
  cacheManager.setItem(adminKey, '', { ttl: 1 }).catch()
  if (key === 'ssr-scripts') {
    cacheManager.setItem(`ssr-scripts:${tenant}`, '', { ttl: 1 }).catch()
  }
  if (key === 'app-configuration') {
    cacheManager.setItem(`app-configuration:${tenant}`, '', { ttl: 1 }).catch()
  }
}

Configuration.statics.getWithCache = function getByKey(tenant, key, isAdmin) {
  const publicKey = cachePrefix + tenant + ':' + key;
  if (isAdmin) {
    return cacheManager.wrap(cachePrefix + tenant + ':admin:' + key, () => {
      return this.getForEdit(tenant, key).lean().then(config => {
        if (config.public) {
          cacheManager.setItem(publicKey, JSON.stringify({
            tenant,
            key,
            metadata: config.metadata
          }, { ttl: FOREVER_TTL })).catch()
        }
        return JSON.stringify({ tenant, key, metadata: config.metadata });
      });
    }, { ttl: FOREVER_TTL })
  }
  return cacheManager.wrap(cachePrefix + tenant + ':' + key, () => {
    return this.findOne({ key, tenant, public: true })
      .select('tenant key metadata')
      .lean()
      .exec()
      .then(config => {
        return JSON.stringify({ tenant, key, metadata: config.metadata })
      })
  }, { ttl: FOREVER_TTL })
}

Configuration.post('save', function () {
  cacheManager.setItem(cachePrefix + this.tenant + ':' + this.key, '', { ttl: 1 })
})

module.exports = mongoose.model('Configuration', Configuration)
