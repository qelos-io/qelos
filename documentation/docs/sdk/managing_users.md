---
title: Managing Users
---

# {{ $frontmatter.title }}

This section provides an overview of managing users using the Qelos SDK. The examples demonstrate how to create, update, remove, and retrieve user information, enabling administrators to effectively manage user accounts.

**Note**: User management is only available through the administrator SDK (`QelosAdminSDK`), not the regular SDK.

## User Methods

The `users` module in the administrator SDK provides the following methods:

### Getting List of Users

To get a list of all users:

```typescript
const users = await sdkAdmin.users.getList();
```

You can also filter users by username or roles:

```typescript
// Filter by username
const users = await sdkAdmin.users.getList({ 
  username: 'john',
  exact: false // Set to true for exact match
});

// Filter by roles
const adminUsers = await sdkAdmin.users.getList({ 
  roles: ['admin', 'superadmin']
});
```

### Getting a Specific User

To retrieve information about a specific user:

```typescript
const user = await sdkAdmin.users.getUser('userId');
```

### Creating a User

To create a new user:

```typescript
const newUser = await sdkAdmin.users.create({
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'securePassword123',
  firstName: 'John',
  lastName: 'Doe',
  roles: ['user'],
  metadata: {
    // Custom metadata
  }
});
```

### Updating a User

To update an existing user's information:

```typescript
const updatedUser = await sdkAdmin.users.update('userId', {
  email: 'newemail@example.com',
  firstName: 'Jane',
  roles: ['user', 'editor']
});
```

You can also update the user's password:

```typescript
await sdkAdmin.users.update('userId', {
  password: 'newSecurePassword123'
});
```

### Removing a User

To remove a user:

```typescript
await sdkAdmin.users.remove('userId');
```

## Working with Encrypted User Data

The SDK provides methods to store and retrieve encrypted data for users:

### Getting Encrypted Data

To retrieve encrypted data for a user:

```typescript
const encryptedData = await sdkAdmin.users.getEncryptedData('userId', 'encryptedId');
```

### Setting Encrypted Data

To store encrypted data for a user:

```typescript
await sdkAdmin.users.setEncryptedData('userId', 'encryptedId', {
  secretKey: 'value',
  apiToken: 'token'
});
```

## User Interfaces

### IManagedUser Interface

```typescript
interface IManagedUser<T = any> extends IUser {
  internalMetadata?: T;
}
```

### IUser Interface

```typescript
interface IUser {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  fullName: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  roles: string[];
  metadata: any;
  [key: string]: any;
}
```

### IManagedUserRequest Interface

```typescript
interface IManagedUserRequest<T = any> extends IManagedUser<T> {
  password?: string;
}
```

## Usage Example

Here's a complete example of managing users:

```typescript
import QelosAdminSDK from '@qelos/sdk/administrator';

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

// Get all users
const users = await sdkAdmin.users.getList();
console.log(`Found ${users.length} users`);

// Get users with specific role
const editors = await sdkAdmin.users.getList({ roles: ['editor'] });
console.log(`Found ${editors.length} editors`);

// Create a new user
const newUser = await sdkAdmin.users.create({
  username: 'johndoe',
  email: 'john@example.com',
  password: 'securePassword123',
  firstName: 'John',
  lastName: 'Doe',
  roles: ['user']
});

console.log(`Created user with ID: ${newUser._id}`);

// Update the user
const updatedUser = await sdkAdmin.users.update(newUser._id, {
  roles: ['user', 'editor'],
  metadata: {
    department: 'Engineering'
  }
});

// Get specific user
const user = await sdkAdmin.users.getUser(newUser._id);
console.log(`User: ${user.username} (${user.email})`);

// Store encrypted data
await sdkAdmin.users.setEncryptedData(newUser._id, 'api-keys', {
  githubToken: 'ghp_xxx',
  slackToken: 'xoxb-xxx'
});

// Retrieve encrypted data
const encryptedData = await sdkAdmin.users.getEncryptedData(newUser._id, 'api-keys');
console.log('Retrieved encrypted data');

// Remove the user
await sdkAdmin.users.remove(newUser._id);
console.log('User removed');
```
