const mongoose = require('mongoose')
const {workspaceConfiguration} = require('../../../config')

const Configuration = mongoose.model('Configuration')

const WORKSPACE_CONFIG = {key: workspaceConfiguration};

let allTenants = [];

/**
 * create initial workspace configuration
 */

/**
 * check if ws-configuration doesn't exist
 */
async function check() {
  console.log('check if all tenants has workspace-configuration:')
  allTenants = await Configuration.distinct('tenant').exec();

  const amountOfConfigs = await Configuration.countDocuments(WORKSPACE_CONFIG).exec()
  return amountOfConfigs !== allTenants.length;
}

/**
 * migrate relevant db rows to fit the new upgrade
 */
async function migrate() {
  console.log('start creating workspace-configurations migration');
  const firstTenant = allTenants[0];
  if (!firstTenant) {
    return;
  }
  const doc = await Configuration.findOne({key: workspaceConfiguration, tenant: firstTenant}).exec();
  if (!doc) {
    await Configuration.create({
      key: workspaceConfiguration,
      description: 'Manage The behavior of workspaces in your application',
      tenant: firstTenant,
      public: true,
      metadata: {
        isActive: false,
        creationPrivilegedRoles: ['user'],
        viewMembersPrivilegedWsRoles: ['user'],
      }
    })
  }
  allTenants.shift();
  migrate();
}

/**
 * check if all migration changes done as expected
 */
async function verify() {
  allTenants = await Configuration.distinct('tenant').exec();

  const amountOfConfigs = await Configuration.countDocuments(WORKSPACE_CONFIG).exec();

  return amountOfConfigs === allTenants.length ? true : Promise.reject('not all tenants has workspace configuration');
}

module.exports = {
  check, migrate, verify
}
