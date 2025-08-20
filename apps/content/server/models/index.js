const mongoose = require('mongoose')

function connect(uri) {
  return mongoose.connect(uri, {})
    .catch((err) => {
      console.error(`Mongoose connection error: ${err}`)
      console.log('try again in 100ms..')
      return new Promise(resolve => setTimeout(resolve, 100))
        .then(() => connect(uri))
    })
}

module.exports.connect = (uri) => {
  const promise = connect(uri)
  // plug in the promise library:
  mongoose.Promise = global.Promise

  
  async function disconnect() {
    await mongoose.connection.close()
  }

  // disconnect on exit
  process.on('exit', disconnect)
  // disconnect on kill from k8s pod
  process.on('SIGTERM', disconnect)
  // disconnect on ctrl+c
  process.on('SIGINT', disconnect)

  // load models
  require('./configuration')
  require('./block');

  return promise
}
