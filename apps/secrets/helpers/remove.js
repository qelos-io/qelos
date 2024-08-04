/**
 * this file used to initiate basic data inside the authentication service
 */
const { removeAll } = require('../server/dao/secrets')

const TENANT = process.env.TENANT;

if (!TENANT) {
  console.log('you must specify the tenant you want to be removed');
  process.exit(0);
}

console.log("initiate remove tenant");

Promise.all([
  removeAll(TENANT),
])
  .then(() => {
    console.log("tenant deleted successfully");
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

