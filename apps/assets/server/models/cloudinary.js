const { getSecret } = require("../services/secrets-management");
const cloudinary = require('cloudinary').v2;

class Cloudinary {
  constructor(storage) {
    this.storage = storage;
    this.name = storage.name;
    this.ready = getSecret(storage.tenant, storage.authentication).then((decrypted) => {
      const auth = decrypted.value;
      cloudinary.config({
        cloud_name: storage.metadata.bucketName,
        api_key: auth.apiKey,
        api_secret: auth.apiSecret,
        secure: true
      });
    });
  }

  list(prefix = '/') {
    prefix = prefix !== '/' && prefix.startsWith('/') ? prefix.slice(1) : prefix;
    return cloudinary.search.expression(
      `folder:${prefix}*`
    ).execute();
  }


  upload(file, options) {
    return cloudinary.uploader.upload(file, options).catch(() => {
      emitPlatformEvent({
        tenant: this.storage.tenant,
        source: 'assets',
        kind: 'storage-connection-error',
        eventName: 'cloudinary-connection-error',
        description: `Cloudinary connection error`,
        metadata: {
          storage: {
            _id: this.storage._id,
            kind: this.storage.kind,
            name: this.storage.name
          }
        }
      }).catch(() => null)
      throw { message: 'could not upload asset to storage: ' + this.name };
    });
  }

  remove(publicId) {
    return cloudinary.api.delete_resources([publicId]);
  }

  rename(oldIdentifier, newIdentifier) {
    return cloudinary.uploader.rename(oldIdentifier, newIdentifier);
  }
}

module.exports = Cloudinary;

