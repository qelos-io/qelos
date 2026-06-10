# Content & Blocks

Tenant-scoped configuration documents and reusable content snippets.

## What Users Can Do

- **Manage configurations**: Store key-value app settings (public or admin-only)
- **Configure app branding**: App name, URLs, auth settings, SSR scripts, workspace mode
- **Create content blocks**: Reusable HTML/content snippets for login pages, headers, plugin UI
- **Cross-tenant admin**: Main-tenant admins manage configurations for any tenant

## Configuration Endpoints

### GET /api/configurations
List configuration keys (admin); filter by key pattern, public flag, kind.

### GET /api/configurations/:key
Read configuration; non-admins get public/cached view.

### POST /api/configurations
Create configuration (admin).

**Request**: key, kind, public, metadata

### PUT /api/configurations/:key
Update description and metadata (admin).

### DELETE /api/configurations/:key
Delete configuration; `app-configuration` key is protected.

## Block Endpoints

### GET /api/blocks
Browse paginated content blocks.

### GET /api/blocks/:blockId
Read block content.

### POST /api/blocks
Create block.

**Request**: name, description, content, contentType

### PUT /api/blocks/:blockId
Update block fields.

### DELETE /api/blocks/:blockId
Remove block.

## Key Configuration Types

| Key | Purpose |
|-----|---------|
| `app-configuration` | App name, logo, website URLs, home screen |
| `auth-configuration` | Login layout, social providers, registration rules |
| `workspace-configuration` | Workspace mode, required workspace, labels |
| `ssr-scripts` | Head/body scripts injected by gateway |
| `users-header` | Custom user menu/header content |
| `design-configuration` | Theme colors, typography, spacing tokens |

## Related

- [Configurations screen](../frontend/configurations/PRODUCT.md)
- [Content boxes screen](../frontend/content-blocks/PRODUCT.md)
