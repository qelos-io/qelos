/**
 * this file used to initiate basic data inside the authentication service
 */
const config = require('../config');
const mongoose = require('mongoose');
require("../server/models").connect(config.mongoUri);

const TENANT = process.env.TENANT;

if (!TENANT) {
  console.log('you must specify the tenant you want to be removed');
  process.exit(0);
}

const Storage = mongoose.model("Storage");

console.log("initiate remove tenant");

Promise.all([
  Storage.deleteMany({ tenant: TENANT }),
])
  .then(() => {
    console.log("tenant deleted successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

