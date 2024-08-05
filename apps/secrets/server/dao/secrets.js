const { mongoUri } = require('../../config');

let secretModel;
if (mongoUri) {
  require('./mongo/connect')(mongoUri);
  secretModel = require('./mongo/secret');
}

module.exports = {
  getItem: (tenant, key) => secretModel.getItem(tenant, key),
  setItem: (tenant, key, value) => secretModel.setItem(tenant, key, value),
  removeAll: (tenant) => {
    if (!tenant) {
      throw new Error('tenant must be provided');
    }
    return secretModel.removeAll(tenant)
  },
}
