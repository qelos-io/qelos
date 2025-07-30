const AWS = require('@aws-sdk/client-s3');
const { getSecret } = require('../services/secrets-management');
const ASSET_TYPES = require('../utils/asset-types.json');

class S3 {
  constructor(storage) {
    this.storage = storage;
    this.name = storage.name;
    this.ready = getSecret(storage.tenant, storage.authentication).then(
      (decrypted) => {
        const { accessKeyId, secretAccessKey } = decrypted.value;

        let endpoint;
        if (storage.metadata.bucketUrl) {
          endpoint = new AWS.Endpoint(storage.metadata.bucketUrl);
        }

        this._client = new AWS.S3({
          endpoint,
          region: storage.metadata.region,
          accessKeyId,
          secretAccessKey,
          signatureVersion: storage.metadata.signatureVersion || (storage.metadata.bucketUrl.includes('digitaloceanspaces.com') ? 'v4' : undefined),
        });
        this.bucket = { name: storage.metadata.bucketName };

      },
      () => {
        throw new Error('could not read AWS credentials');
      }
    );
  }

  async list(path) {
    try {
      const listedObjects = await this._client
        .listObjectsV2({
          Bucket: this.bucket.name,
          Prefix: path.slice(1),
          Delimiter: "/",
        })

      const files = listedObjects.Contents.map(content => ({
        ...content,
        metadata: {
          name: content.Key,
        }
      }));

      const folders = listedObjects.CommonPrefixes.map(({ Prefix }) => ({
        metadata: {
          name: Prefix,
          kind: ASSET_TYPES.DIRECTORY
        }
      }));

      return [...folders, ...files];

    } catch (error) {
      throw { message: 'could not retrieve assets from storage: ' + this.name };
    }
  }

  async upload(fullPath, file) {
    try {
      await this._client
        .createMultipartUpload({
          Bucket: this.bucket.name,
          Key: fullPath.slice(1),
          Body: file.buffer,
          ContentType: file.type
        })

    } catch (error) {
      emitPlatformEvent({
        tenant: this.storage.tenant,
        source: 'assets',
        kind: 'storage-connection-error',
        eventName: 's3-connection-error',
        description: `S3 connection error`,
        metadata: {
          storage: {
            _id: this.storage._id,
            kind: this.storage.kind,
            name: this.storage.name
          }
        }
      }).catch(() => null)
      throw { message: 'could not upload asset to storage: ' + this.name };
    }
  }

  async remove(file) {
    try {
      const params = {
        Bucket: this.bucket.name,
        Prefix: file.slice(1),
        Delimiter: "/"
      };

      const listedObjects = await this._client.listObjectsV2(params);

      if (listedObjects.Contents.length === 0) return;

      const deleteParams = {
        Bucket: this.bucket.name,
        Delete: { Objects: listedObjects.Contents.map(({ Key }) => ({ Key })) }
      };

      await this._client.deleteObjects(deleteParams);

      if (listedObjects.IsTruncated) await this.remove(file);

    } catch (error) {
      throw { message: 'could not remove asset from storage: ' + file };
    }
  }

  async rename(oldFullPath, newFullPath) {

    try {

      const params = {
        Bucket: this.bucket.name,
        CopySource: encodeURIComponent(`/${this.bucket.name}${oldFullPath}`),
        Key: newFullPath.slice(1),
      };

      await this._client.copyObject(params);

      await this.remove(oldFullPath);

    } catch (e) {
      throw { message: 'could not name asset: ' + oldFullPath };
    }

  }
}

module.exports = S3;
