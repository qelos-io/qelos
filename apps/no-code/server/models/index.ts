import mongoose from 'mongoose'

export const connect = (uri: string) => {
  mongoose.connect(uri, {})
  // plug in the promise library:
  mongoose.Promise = global.Promise

  mongoose.connection.on('error', (err) => {
    console.error(`Mongoose connection error: ${err}`)
    process.exit(1)
  })

  
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
  require('./blueprint')
  require('./blueprint-entity')
}
