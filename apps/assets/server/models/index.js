const mongoose = require('mongoose');

module.exports.connect = (uri) => {
  mongoose.connect(uri, { });
  // plug in the promise library:
  mongoose.Promise = global.Promise;


  mongoose.connection.on('error', (err) => {
    console.error(`Mongoose connection error: ${err}`);
    process.exit(1);
  });

  // disconnect on exit
  process.on('exit', () => {
    mongoose.connection.close();
  });

  // load models
  require('./storage');
};
