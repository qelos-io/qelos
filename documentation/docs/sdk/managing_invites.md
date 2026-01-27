---
title: Managing Invites
---
# Managing Invites

This section covers how to manage workspace invites using the Qelos SDK. The invites module allows users to handle workspace invitations, including viewing, accepting, and declining them.

## Invite Methods

The `invites` module in the Qelos SDK provides several methods for managing workspace invitations:

### Getting a List of Invites

To retrieve a list of all invites for the current user:

```typescript
const invites = await sdk.invites.getList();
```

This returns an array of `IInvite` objects containing details about each invitation.

### Accepting a Workspace Invitation

To accept an invitation to join a workspace:

```typescript
await sdk.invites.acceptWorkspace(workspaceId);
```

### Declining a Workspace Invitation

To decline an invitation to join a workspace:

```typescript
await sdk.invites.declineWorkspace(workspaceId);
```

## Invite Interfaces

### IInvite Interface

```typescript
interface IInvite {
  workspace: {
    name: string;
    logo?: string;
    _id: string;
  }
}
```

### InviteKind Enum

The SDK defines an enum for invitation actions:

```typescript
enum InviteKind {
  DECLINE = 'decline',
  ACCEPT = 'accept',
}
```

## Usage Example

Here's a complete example of how to use the invites module:

```typescript
import { QelosSDK } from '@qelos/sdk';

// Initialize the SDK
const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-app.com',
});

// Authenticate the user
await sdk.authentication.oAuthSignin({
  username: 'user@example.com',
  password: 'password'
});

// Get all invites for the current user
const invites = await sdk.invites.getList();

// Process each invite
invites.forEach(async (invite) => {
  const workspaceId = invite.workspace._id;
  
  // Accept the invitation
  // You could implement your own logic to determine whether to accept or decline
  await sdk.invites.acceptWorkspace(workspaceId);
  
  // Or decline the invitation
  // await sdk.invites.declineWorkspace(workspaceId);
});
```
