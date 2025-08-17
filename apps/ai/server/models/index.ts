import mongoose from 'mongoose'

// Import models
import './thread'

export const connect = (uri: string) => {
  mongoose.connect(uri, {})
  // plug in the promise library:
  mongoose.Promise = global.Promise

  mongoose.connection.on('error', (err) => {
    console.error(`Mongoose connection error: ${err}`)
    process.exit(1)
  })

  // disconnect on exit
  process.on('exit', () => {
    mongoose.connection.close()
  })

  // models are loaded via imports above
}
