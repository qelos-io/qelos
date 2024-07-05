
const mongoose = require("mongoose");
const { ssrScriptsConfiguration } = require("../../../config");

const Configuration = mongoose.model("Configuration");

const SSR_SCRIPTS_CONFIG = { key: ssrScriptsConfiguration };

let allTenants = [];

/**
 * check if ssr-scripts-configuration doesn't exist
 */
async function check() {
  console.log("check if all tenants has ssr-scripts-configuration:");
  allTenants = await Configuration.distinct("tenant").exec();

  const amountOfConfigs = await Configuration.countDocuments(
    SSR_SCRIPTS_CONFIG
  ).exec();
  return amountOfConfigs !== allTenants.length;
}

/**
 * migrate relevant db rows to fit the new upgrade
 */
async function migrate() {
  console.log("start creating ssr-scripts-configurations migration");
  const firstTenant = allTenants[0];
  if (!firstTenant) {
    return;
  }
  const doc = await Configuration.findOne({
    key: ssrScriptsConfiguration,
    tenant: firstTenant,
  }).exec();
  if (!doc) {
    await Configuration.create({
      key: ssrScriptsConfiguration,
      description: "Add HTML/JS code snippets in your application",
      tenant: firstTenant,
      public: true,
      metadata: {
        head: "",
        body: "",
      },
    });
  }
  allTenants.shift();
  return migrate();
}

/**
 * check if all migration changes done as expected
 */
async function verify() {
  allTenants = await Configuration.distinct("tenant").exec();

  const amountOfConfigs = await Configuration.countDocuments(
    SSR_SCRIPTS_CONFIG
  ).exec();

  return amountOfConfigs === allTenants.length
    ? true
    : Promise.reject("not all tenants has ssr-scripts configuration");
}

module.exports = {
  check,
  migrate,
  verify,
};
