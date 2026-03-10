import mongoose from 'mongoose';

export const connect = (uri: string) => {
  mongoose.connect(uri, {});
  mongoose.Promise = global.Promise;

  mongoose.connection.on('error', (err) => {
    console.error(`Mongoose connection error: ${err}`);
    process.exit(1);
  });

  async function disconnect() {
    await mongoose.connection.close();
  }

  process.on('exit', disconnect);
  process.on('SIGTERM', disconnect);
  process.on('SIGINT', disconnect);

  require('./plan');
  require('./subscription');
  require('./invoice');
  require('./coupon');
  require('./webhook-event');
};
