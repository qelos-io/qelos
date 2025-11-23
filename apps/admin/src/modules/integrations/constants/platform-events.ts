export interface PlatformEventDefinition {
  source: string;
  kind: string;
  eventName: string;
  description: string;
}

export const PLATFORM_EVENTS: PlatformEventDefinition[] = [
  {
    source: 'auth',
    kind: 'signup',
    eventName: 'user-registered',
    description: 'New user signed up'
  },
  {
    source: 'auth',
    kind: 'users',
    eventName: 'user-created',
    description: 'User created by admin'
  },
  {
    source: 'auth',
    kind: 'users',
    eventName: 'user-updated',
    description: 'User information updated'
  },
  {
    source: 'auth',
    kind: 'users',
    eventName: 'user-removed',
    description: 'User deleted'
  },
  {
    source: 'auth',
    kind: 'failed-social-login',
    eventName: 'failed-linkedin-login',
    description: 'LinkedIn login failed'
  },
  {
    source: 'auth',
    kind: 'failed-social-login',
    eventName: 'failed-facebook-login',
    description: 'Facebook login failed'
  },
  {
    source: 'auth',
    kind: 'failed-social-login',
    eventName: 'failed-google-login',
    description: 'Google login failed'
  },
  {
    source: 'auth',
    kind: 'failed-social-login',
    eventName: 'failed-github-login',
    description: 'GitHub login failed'
  },
  {
    source: 'assets',
    kind: 'asset-operation',
    eventName: 'asset-uploaded',
    description: 'File/asset uploaded'
  },
  {
    source: 'assets',
    kind: 'storage-connection-error',
    eventName: 's3-connection-error',
    description: 'S3 connection failed'
  },
  {
    source: 'assets',
    kind: 'storage-connection-error',
    eventName: 'gcs-connection-error',
    description: 'Google Cloud Storage failed'
  },
  {
    source: 'assets',
    kind: 'storage-connection-error',
    eventName: 'ftp-connection-error',
    description: 'FTP connection failed'
  },
  {
    source: 'assets',
    kind: 'storage-connection-error',
    eventName: 'cloudinary-connection-error',
    description: 'Cloudinary connection failed'
  },
  {
    source: 'auth',
    kind: 'invites',
    eventName: 'invite-responded',
    description: 'User responded to an invite'
  },
  {
    source: 'auth',
    kind: 'invites',
    eventName: 'invite-created',
    description: 'New invite created'
  },
  {
    source: 'auth',
    kind: 'workspaces',
    eventName: 'workspace-created',
    description: 'New workspace created'
  },
  {
    source: 'auth',
    kind: 'workspaces',
    eventName: 'workspace-deleted',
    description: 'Workspace deleted'
  },
  {
    source: 'ai',
    kind: 'threads',
    eventName: 'create',
    description: 'AI thread created'
  },
  {
    source: 'ai',
    kind: 'threads',
    eventName: 'delete',
    description: 'AI thread deleted'
  }
];
