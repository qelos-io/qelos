const { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSecret } = require('../services/secrets-management');
const ASSET_TYPES = require('../utils/asset-types.json');
const logger = require('../services/logger');

class S3 {
  constructor(storage) {
    this.storage = storage;
    this.name = storage.name;
    this.shouldUploadAsPublic = !!storage.metadata.publicUrl?.trim();
    this.ready = getSecret(storage.tenant, storage.authentication).then(
      (decrypted) => {
        const { accessKey, secretKey } = decrypted.value;

        let endpoint;
        try {
          if (storage.metadata.bucketUrl) {
            // e.g. https://fra1.digitaloceanspaces.com or fra1.digitaloceanspaces.com
            endpoint = storage.metadata.bucketUrl.includes('https://') ? storage.metadata.bucketUrl : 'https://' + storage.metadata.bucketUrl;
          }
        } catch (e) {
          logger.error('logging e', e);
        }

        // Extract region from endpoint URL for DigitalOcean Spaces if not explicitly provided
        let region = storage.metadata.region;
        if (!region && endpoint && endpoint.includes('digitaloceanspaces.com')) {
          // Extract region from URL like https://fra1.digitaloceanspaces.com
          const match = endpoint.match(/https?:\/\/([^.]+)\.digitaloceanspaces\.com/);
          if (match && match[1]) {
            region = match[1];
          }
        }
        
        // For DigitalOcean Spaces, ensure we're using the correct configuration
        const isDigitalOcean = endpoint && endpoint.includes('digitaloceanspaces.com');
        
        const clientConfig = {
          endpoint,
          region: isDigitalOcean ? region : (region || undefined),
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey
          },
          forcePathStyle: isDigitalOcean ? false : undefined,
        };
        
        this._client = new S3Client(clientConfig);
        this.bucket = { name: storage.metadata.bucketName.replace('s3://', '') };

      },
      () => {
        throw new Error('could not read AWS credentials');
      }
    );
  }

  async list(path) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket.name,
        Prefix: path.slice(1),
        Delimiter: "/",
      });
      
      const listedObjects = await this._client.send(command);

      const files = (listedObjects.Contents || []).map(content => ({
        ...content,
        metadata: {
          name: content.Key,
        }
      }));

      const folders = (listedObjects.CommonPrefixes || []).map(({ Prefix }) => ({
        metadata: {
          name: Prefix,
          kind: ASSET_TYPES.DIRECTORY
        }
      }));

      return [...folders, ...files];

    } catch (error) {
      logger.error('S3 list error:', error);
      throw { message: 'could not retrieve assets from storage: ' + this.name };
    }
  }

  async upload(fullPath, file) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket.name,
        Key: fullPath.slice(1),
        Body: file.buffer,
        ContentType: file.type,
        ACL: this.shouldUploadAsPublic ? 'public-read' : undefined
      });
      
      return await this._client.send(command);

    } catch (error) {
      logger.error('S3 upload error:', error);
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
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucket.name,
        Prefix: file.slice(1),
        Delimiter: "/"
      });

      const listedObjects = await this._client.send(listCommand);

      if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;

      // In AWS SDK v3, there's no direct deleteObjects command
      // We need to delete objects one by one
      for (const { Key } of listedObjects.Contents) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucket.name,
          Key
        });
        return await this._client.send(deleteCommand);
      }

      if (listedObjects.IsTruncated) await this.remove(file);

    } catch (error) {
      logger.error('S3 remove error:', error);
      throw { message: 'could not remove asset from storage: ' + file };
    }
  }

  async rename(oldFullPath, newFullPath) {
    try {
      // First, get the object to copy it
      const copyCommand = new PutObjectCommand({
        Bucket: this.bucket.name,
        CopySource: encodeURIComponent(`/${this.bucket.name}${oldFullPath}`),
        Key: newFullPath.slice(1),
      });

      await this._client.send(copyCommand);

      // Then remove the old object
      return await this.remove(oldFullPath);

    } catch (e) {
      logger.error('S3 rename error:', e);
      throw { message: 'could not rename asset: ' + oldFullPath };
    }
  }
}

module.exports = S3;
