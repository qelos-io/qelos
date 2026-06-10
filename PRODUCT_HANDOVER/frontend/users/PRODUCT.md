# Users & Profile

Tenant user administration and self-service profile management.

## What Users Can Do

- **List users (admin)**: Search, filter, create users at `/users`
- **Create user (admin)**: Provision accounts with roles at `/users/new`
- **Edit user (admin)**: Update profile, roles, workspace assignments at `/users/:userId`
- **Manage profile**: Edit own name, avatar, password at `/users/me`
- **View payments**: Own subscription/billing tab
- **Manage API tokens**: Create, list, revoke personal API keys

## Interface Elements

| Screen | Route | Key elements |
|--------|-------|--------------|
| **Users list** | `/users` | Searchable table, filters, create button |
| **Create user** | `/users/new` | Name, email, password, roles form |
| **Edit user** | `/users/:userId` | Profile, roles, workspace assignments |
| **My profile** | `/users/me` | Tabs: General, Payments, API Tokens |

## Profile Tabs

- **General** — Name, avatar, password change
- **Payments** — Active subscription, billing history link
- **API Tokens** — Create token (nickname, expiry), list, revoke

## Related

- [Users & API tokens API](../../api/users-and-tokens.md)
- [Authentication](../auth/PRODUCT.md)
