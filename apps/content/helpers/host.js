/**
 * this file used to initiate basic data inside the authentication service
 */
const config = require('../config');
const mongoose = require('mongoose');
const { appConfiguration } = require("../config");
require("../server/models").connect(config.mongoUri);

const TENANT = process.env.TENANT || "0";
const HOST = process.env.HOST || "127.0.0.1";

const Configuration = mongoose.model("Configuration");

async function changeHost() {

  const otherTenantWithHostname = await Configuration.findOne({ 'metadata.websitesUrls': HOST }).exec()

  if (otherTenantWithHostname) {
    throw new Error(`The hostname ${HOST} is already used by another tenant`);
  }

  const configuration = await Configuration.findOne({ tenant: TENANT, key: appConfiguration }).exec()

  configuration.metadata.websiteUrls = [HOST];

  configuration.markModified('metadata.websiteUrls');
  await configuration.save()
}

console.log("initiate content");

Promise.all([
  changeHost(),
])
  .then(() => {
    console.log("host changed successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

