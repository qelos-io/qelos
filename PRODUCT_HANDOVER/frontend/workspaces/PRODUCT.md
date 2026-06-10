# Workspaces

Multi-tenant workspace management for users and platform admins.

## What Users Can Do

- **List workspaces**: View owned workspaces and pending invites at `/workspaces`
- **Create workspace**: Name, logo, initial invites at `/workspaces/new`
- **Edit workspace**: Manage settings across six tabs at `/workspaces/:id`
- **Admin workspaces**: Platform-wide list, create, edit at `/admin/workspaces`

## Workspace Tabs

| Tab | What users can do |
|-----|-------------------|
| **General** | Name, logo, labels, delete workspace |
| **Members** | View/add/remove members, assign roles |
| **Payments** | Workspace billing and subscription |
| **Integrations** | Workspace-scoped integration connections |
| **Security** | Access and security settings |
| **Advanced** | Advanced configuration options |

## Interface Elements

- **My Workspaces** — Card/list view with pending invites section
- **Invites list** — Accept/decline pending invitations
- **Admin workspaces** — Label filter, create workspace, edit any workspace

## Related

- [Workspaces & invites API](../../api/workspaces-and-invites.md)
- [Pricing](../pricing/PRODUCT.md)
