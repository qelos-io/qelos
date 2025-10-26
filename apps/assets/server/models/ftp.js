const Client = require('ftp')
const { getSecret } = require('../services/secrets-management')
const { emitPlatformEvent } = require('@qelos/api-kit')

class Ftp {
  constructor (storage) {
    this.name = storage.name
    this.ready = getSecret(storage.tenant, storage.authentication)
      .then(decrypted => {
        const auth = decrypted.value
        this._client = new Client()
        return new Promise((resolve, reject) => {
          this._client.connect({
            host: auth.host,
            user: auth.username,
            password: auth.password
          })
          this._client.on('ready', resolve)
          this._client.on('error', (err) => {
            reject({ message: 'could not connect to FTP server: ' + auth.host, err })
            emitPlatformEvent({
              tenant: storage.tenant,
              source: 'assets',
              kind: 'storage-connection-error',
              eventName: 'ftp-connection-error',
              description: `FTP connection error: ${auth.host}`,
              metadata: {
                storage: {
                  _id: storage._id,
                  kind: storage.kind,
                  name: storage.name
                }
              }
            }).catch(() => null)
          })
        })
      }, () => {
        throw new Error('could not read FTP credentials')
      })
  }

  list (path) {
    return new Promise((resolve, reject) => {
      this._client.list(path, (err, list) => {
        if (err) {
          return reject({ message: 'could not retrieve assets from storage: ' + this.name })
        }
        resolve(list || [])
      })
    })
  }

  upload (path, file) {
    return new Promise((resolve, reject) => {
      // FTP client expects: ReadableStream with pipe/resume methods, Buffer, or string (path to local file)
      let fileInput;
      
      if (Buffer.isBuffer(file)) {
        // If it's already a Buffer, use it directly
        fileInput = file;
      } else if (file.buffer && Buffer.isBuffer(file.buffer)) {
        // If it has a buffer property that's a Buffer, use that
        fileInput = file.buffer;
      } else if (typeof file === 'string') {
        // If it's a string (file path), use it directly
        fileInput = file;
      } else if (file.pipe && typeof file.pipe === 'function' && file.resume && typeof file.resume === 'function') {
        // If it has pipe and resume methods, it's a readable stream
        fileInput = file;
      } else {
        // Convert to Buffer as a last resort
        try {
          fileInput = Buffer.from(file);
        } catch (e) {
          return reject({ message: 'Invalid file format for FTP upload: ' + this.name });
        }
      }
      
      this._client.append(fileInput, path, (err) => {
        if (err) {
          return reject({ message: 'could not upload asset to storage: ' + this.name })
        }
        resolve()
      })
    })
  }

  remove (path) {
    const pathArr = path.split('/')
    const currentItemToRemove = pathArr[pathArr.length - 1]

    return this.list(pathArr.slice(0, -1).join('/'))
      .then(list => {
        const item = list.find(item => item.name === currentItemToRemove)
        if (!item) {
          return Promise.reject({ message: 'asset with Identifier not found' })
        }

        return new Promise((resolve, reject) => {
          // remove for directories, delete for all the rest
          const actionToRun = item.type === 'd' ? 'remove' : 'delete'

          this._client[actionToRun](path, (err) => {
            if (err) {
              return reject({ message: 'could not remove asset from storage: ' + path })
            }
            resolve()
          })
        })
      })
  }

  destroy () {
    if (this._client) {
      this._client.destroy()
    }
  }
}

module.exports = Ftp
