export interface StorageProvider {
  value: string;
  label: string;
  hint: string;
  logo: string;
  /** label of the container field (bucket / cloud); ftp has none */
  containerLabel?: string;
  /** what usually goes wrong, shown next to a failed connection test */
  troubleshooting: string;
}

export const STORAGE_PROVIDERS: StorageProvider[] = [
  {
    value: 's3',
    label: 'Amazon S3',
    hint: 'Buckets on AWS or any S3-compatible service',
    logo: '/logos/storage-s3.png',
    containerLabel: 'Bucket Name',
    troubleshooting: 'Check the access keys, the bucket name and that the key may list the bucket.',
  },
  {
    value: 'gcs',
    label: 'Google Cloud',
    hint: 'Buckets accessed with a service-account key',
    logo: '/logos/storage-gcs.png',
    containerLabel: 'Bucket Name',
    troubleshooting: 'Check the service-account JSON key and that it has access to the bucket.',
  },
  {
    value: 'cloudinary',
    label: 'Cloudinary',
    hint: 'Media library with image optimization',
    logo: '/logos/storage-cloudinary.png',
    containerLabel: 'Cloud Name',
    troubleshooting: 'Check the cloud name, API key and API secret.',
  },
  {
    value: 'ftp',
    label: 'FTP',
    hint: 'Any server reachable over FTP',
    logo: '/logos/storage-ftp.png',
    troubleshooting: 'Check the host, the username and password, and that the server accepts connections.',
  },
];

export function getStorageProvider(kind?: string) {
  return STORAGE_PROVIDERS.find((provider) => provider.value === kind);
}

const REQUIRED_CREDENTIALS: Record<string, { key: string; label: string }[]> = {
  s3: [
    { key: 'accessKey', label: 'Access Key' },
    { key: 'secretKey', label: 'Secret Key' },
  ],
  gcs: [{ key: 'private_key', label: 'GCS JSON Key' }],
  cloudinary: [
    { key: 'apiKey', label: 'Api Key' },
    { key: 'apiSecret', label: 'Api Secret' },
  ],
  ftp: [
    { key: 'host', label: 'FTP Host' },
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password' },
  ],
};

/** Labels of the credential fields that are still empty for this provider. */
export function getMissingCredentials(kind: string, authentication: Record<string, any> | null | undefined): string[] {
  const required = REQUIRED_CREDENTIALS[kind] ?? [];
  return required
    .filter(({ key }) => {
      const value = authentication?.[key];
      return typeof value !== 'string' ? !value : !value.trim();
    })
    .map(({ label }) => label);
}
