import { mongoUri } from '../config';
import mongoose from 'mongoose';

require('../server/models').connect(mongoUri);

const TENANT = process.env.TENANT;

if (!TENANT) {
  console.log('you must specify the tenant you want to be removed');
  process.exit(0);
}

const User = mongoose.model('User');

console.log('initiate remove tenant');

Promise.all([
  User.deleteMany({ tenant: TENANT }),
])
  .then(() => {
    console.log('tenant deleted successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

