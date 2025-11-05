---
title: Managing Workspaces
---

# {{ $frontmatter.title }}

This section covers how to manage workspaces using the Qelos SDK. Workspaces in Qelos provide multi-tenant support, allowing you to organize users and resources efficiently.

## Workspace Methods

The `workspaces` module in the Qelos SDK provides several methods for managing workspaces:

### Getting a List of Workspaces

To retrieve a list of all workspaces the current user has access to:

```typescript
const workspaces = await sdk.workspaces.getList();
```

This returns an array of `IWorkspace` objects containing details about each workspace.

### Getting a Specific Workspace

To retrieve details about a specific workspace:

```typescript
const workspace = await sdk.workspaces.getWorkspace(workspaceId);
```

### Getting Workspace Members

To retrieve the members of a specific workspace:

```typescript
const members = await sdk.workspaces.getMembers(workspaceId);
```

This returns an array of `IWorkspaceMember` objects containing details about each member.

### Creating a New Workspace

To create a new workspace:

```typescript
const newWorkspace = await sdk.workspaces.create({
  name: "My New Workspace",
  labels: ["team", "project"]
});
```

### Updating a Workspace

To update an existing workspace:

```typescript
const updatedWorkspace = await sdk.workspaces.update(workspaceId, {
  name: "Updated Workspace Name",
  logo: "https://example.com/logo.png"
});
```

### Activating a Workspace

To activate a specific workspace (set it as the current active workspace):

```typescript
const activatedWorkspace = await sdk.workspaces.activate(workspaceId);
```

### Removing a Workspace

To remove a workspace:

```typescript
await sdk.workspaces.remove(workspaceId);
```

## Workspace Interfaces

### IWorkspace Interface

```typescript
interface IWorkspace {
  name: string;
  logo?: string;
  isPrivilegedUser?: boolean;
  members?: IWorkspaceMember[];
  invites?: IInvite[];
  labels: string[];
  [key: string]: any;
}
```

### IWorkspaceMember Interface

```typescript
interface IWorkspaceMember {
  user: string;
  roles: string[];
  created?: string | Date;
}
```

### IInvite Interface

```typescript
interface IInvite {
  name?: string;
  email: string;
  created?: string | Date;
}
```

## Admin Workspaces

For administrative operations on workspaces, you can use the admin SDK. **Note**: These operations are only available through the administrator SDK (`QelosAdminSDK`).

### Getting List of All Workspaces (Admin)

To retrieve a list of all workspaces as an administrator:

```typescript
const workspaces = await sdkAdmin.adminWorkspaces.getList();
```

### Working with Encrypted Workspace Data

The admin SDK provides methods to store and retrieve encrypted data for workspaces:

#### Getting Encrypted Data

To retrieve encrypted data for a workspace:

```typescript
const encryptedData = await sdkAdmin.adminWorkspaces.getEncryptedData('workspaceId', 'encryptedId');
```

#### Setting Encrypted Data

To store encrypted data for a workspace:

```typescript
await sdkAdmin.adminWorkspaces.setEncryptedData('workspaceId', 'encryptedId', {
  apiKey: 'secret-key',
  webhookSecret: 'webhook-secret'
});
```

## Complete Admin Example

Here's a complete example of managing workspaces as an administrator:

```typescript
import QelosAdminSDK from '@qelos/sdk/dist/administrator';

// Initialize the admin SDK
const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://your-qelos-app.com',
  fetch: globalThis.fetch
});

// Authenticate as admin
await sdkAdmin.authentication.oAuthSignin({
  username: 'admin@example.com',
  password: 'password'
});

// Get all workspaces (admin only)
const allWorkspaces = await sdkAdmin.adminWorkspaces.getList();
console.log(`Found ${allWorkspaces.length} workspaces across all tenants`);

// Store encrypted data for a workspace
await sdkAdmin.adminWorkspaces.setEncryptedData('workspaceId', 'api-credentials', {
  stripeApiKey: 'sk_test_xxx',
  stripeWebhookSecret: 'whsec_xxx'
});

// Retrieve encrypted data
const credentials = await sdkAdmin.adminWorkspaces.getEncryptedData('workspaceId', 'api-credentials');
console.log('Retrieved encrypted credentials');
```
