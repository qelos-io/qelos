import { getMissingCredentials, getStorageProvider } from '../storage-providers';

describe('storage providers', () => {
  it('knows the four providers', () => {
    expect(getStorageProvider('s3')?.label).toBe('Amazon S3');
    expect(getStorageProvider('ftp')?.containerLabel).toBeUndefined();
    expect(getStorageProvider('nope')).toBeUndefined();
  });

  it('lists missing credentials per provider', () => {
    expect(getMissingCredentials('s3', null)).toEqual(['Access Key', 'Secret Key']);
    expect(getMissingCredentials('s3', { accessKey: 'a', secretKey: '  ' })).toEqual(['Secret Key']);
    expect(getMissingCredentials('ftp', { host: 'h', username: 'u', password: 'p' })).toEqual([]);
    expect(getMissingCredentials('gcs', { private_key: '-----KEY' })).toEqual([]);
  });
});
