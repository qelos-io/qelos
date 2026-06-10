# Workspaces & Invites

Collaborative spaces within a tenant with members, roles, labels, and invitation workflows.

## What Users Can Do

- **List workspaces**: See all workspaces the user belongs to
- **Create workspace**: Name, logo, labels, optional invites; creator becomes admin
- **Switch workspace**: Activate a workspace to change session context
- **Manage members**: Add, remove, and update roles (workspace admin)
- **Invite others**: Send email/phone invitations with assigned roles
- **Accept/decline invites**: Respond to pending workspace invitations
- **Admin oversight**: Tenant admins search all workspaces platform-wide

## Endpoints

### GET /api/workspaces
List workspaces for the signed-in user.

### POST /api/workspaces
Create a workspace.

**Request**: name, logo, labels, invites[]

### GET /api/workspaces/:workspaceId
View workspace details; admins also see members and pending invites.

### PUT /api/workspaces/:workspaceId
Update name, logo, invites; admins can replace members and labels.

### DELETE /api/workspaces/:workspaceId
Delete workspace (cannot delete currently active workspace).

### POST /api/workspaces/:workspaceId/activate
Switch the user's active workspace in their session.

### GET /api/workspaces/:workspaceId/members
List members with profile and roles (workspace admin).

### POST /api/workspaces/:workspaceId/members
Add existing user with roles (tenant admin).

### PUT /api/workspaces/:workspaceId/members/:userId
Change member roles (workspace admin).

### DELETE /api/workspaces/:workspaceId/members/:userId
Remove member (workspace admin).

### GET /api/workspaces/all
Search all tenant workspaces (tenant admin).

### GET /api/invites
List invitations for the user's email or phone.

### POST /api/invites
Accept or decline an invitation.

**Request**: inviteId, action (accept/decline)

## User Flow

1. User creates workspace or receives invite
2. On accept, user becomes member with assigned workspace roles
3. User activates workspace to scope data and permissions
4. Workspace admin manages members and settings

## Related

- [Users & API tokens](users-and-tokens.md)
- [Workspaces screen](../frontend/workspaces/PRODUCT.md)
