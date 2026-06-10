# Users & API Tokens

Tenant user administration and programmatic access keys.

## What Users Can Do

- **View profile**: See signed-in user, roles, metadata, active workspace
- **Update profile**: Change name, password, custom metadata
- **Manage API tokens**: Create, list, revoke personal keys for programmatic access
- **Admin user CRUD**: Search, create, update, delete tenant users (admin only)
- **View stats**: Total user and workspace counts (admin only)

## Endpoints

### GET /api/me
Return signed-in user profile, roles, metadata, active workspace; supports admin impersonation view.

### POST /api/me
Update profile fields, password, metadata.

### GET /api/me/api-tokens
List caller's API tokens (nickname, expiry, usage, optional workspace scope).

### POST /api/me/api-tokens
Create API token.

**Request**: nickname, expiry, optional workspaceId

**Response**: raw token (shown once, `ql_` prefix)

### DELETE /api/me/api-tokens/:tokenId
Revoke a personal API token.

### GET /api/users
Search or batch-fetch users (tenant admin).

### POST /api/users
Create user with roles and metadata (tenant admin).

### GET /api/users/:userId
View user profile; admins see full fields.

### PUT /api/users/:userId
Update user profile, roles, password (tenant admin).

### DELETE /api/users/:userId
Remove user from tenant (tenant admin).

### GET /api/users/stats
Return user and workspace counts (tenant admin).

## Authentication Methods

| Method | Header/cookie | Use case |
|--------|---------------|----------|
| Cookie session | `qlt_` cookie | Browser admin panel |
| Bearer JWT | `Authorization: Bearer` | Mobile/API clients |
| API token | `x-api-key: ql_...` | Server-to-server, CLI, SDK |

## Related

- [Authentication](auth.md)
- [Users screen](../frontend/users/PRODUCT.md)
