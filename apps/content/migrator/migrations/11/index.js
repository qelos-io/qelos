const mongoose = require('mongoose')

const Configuration = mongoose.model('Configuration')

const AUTH_CONFIG = { key: 'auth-configuration' };

let allTenants = [];

/**
 * create initial workspace configuration
 */

/**
 * check if auth-configuration doesn't exist
 */
async function check() {
  console.log('check if all tenants has auth-configuration:')
  allTenants = await Configuration.distinct('tenant').exec();

  const amountOfConfigs = await Configuration.countDocuments(AUTH_CONFIG).exec()
  return amountOfConfigs !== allTenants.length;
}

/**
 * migrate relevant db rows to fit the new upgrade
 */
async function migrate() {
  console.log('start creating auth-configurations migration');
  const firstTenant = allTenants[0];
  if (!firstTenant) {
    return;
  }
  const doc = await Configuration.findOne({ key: AUTH_CONFIG.key, tenant: firstTenant }).exec();
  if (!doc) {
    await Configuration.create({
      key: AUTH_CONFIG.key,
      description: 'Manage The behavior of authentication in your application',
      tenant: firstTenant,
      public: true,
      metadata: {
        treatUsernameAs: 'username',
        showLoginPage: true,
        showRegisterPage: false,
        additionalUserFields: [],
      }
    })
  }
  allTenants.shift();
  return migrate();
}

/**
 * check if all migration changes done as expected
 */
async function verify() {
  allTenants = await Configuration.distinct('tenant').exec();

  const amountOfConfigs = await Configuration.countDocuments(AUTH_CONFIG).exec();

  return amountOfConfigs === allTenants.length ? true : Promise.reject('not all tenants has auth configuration');
}

module.exports = {
  check, migrate, verify
}
