import { mongoUri } from '../config';
import mongoose from 'mongoose';

require('../server/models').connect(mongoUri);

const TENANT = process.env.TENANT;

if (!TENANT) {
  console.log('you must specify the tenant you want to be removed');
  process.exit(0);
}

const Blueprint = mongoose.model('Blueprint');
const BlueprintEntity = mongoose.model('BlueprintEntity');

console.log('initiate remove tenant');

Promise.all([
  Blueprint.deleteMany({ tenant: TENANT }),
  BlueprintEntity.deleteMany({ tenant: TENANT }),
])
  .then(() => {
    console.log('tenant deleted successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

