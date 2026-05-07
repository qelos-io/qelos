---
title: Permissions & Roles
editLink: true
---

# Permissions and Roles

Authorization in Qelos is role-based. A request's identity (user +
workspace) carries a list of roles, and each protected resource declares
which roles may access it. This page covers how roles are attached to
identities, how to read them from the SDK, and where authorization
checks happen.

## Two layers of roles

Qelos has two distinct role layers and they are checked together:

1. **Tenant roles** — `user.roles: string[]`, the roles the user has on
   the tenant as a whole. `admin` is the most privileged.
2. **Workspace roles** — for the active workspace, the user has a
   per-workspace role list (`workspace.roles` in the auth payload).
   These apply only inside that workspace's scope.

A user may be a regular `user` at the tenant level but `owner` of one
workspace and `member` of another.

## Reading the current user's roles

```ts
const user = await sdk.authentication.getLoggedInUser();
console.log(user.roles); // e.g. ['user', 'editor']
```

The active workspace and its roles are returned alongside auth payloads
(signin, signup, refresh, social callback):

```ts
const { payload } = await sdk.authentication.refreshCookieToken();
console.log(payload.workspace?.roles); // workspace-scoped roles
```

Inside the integrator middleware, the populated context exposes both:

```ts
app.get('/orders', requireUser((req, res) => {
  const { user, workspace } = req.qelos;
  // user.roles  — tenant-level
  // workspace?.roles — workspace-level
}));
```

## Checking roles

Qelos does not (today) ship a single "can this user do X?" helper —
permission rules are evaluated on the server when you call a
protected endpoint. Client-side checks are advisory and used to gate
UI:

```ts
const isAdmin = user.roles.includes('admin');
const canEdit = workspace?.roles?.includes('editor') ?? false;
```

For server-side gates, prefer to attempt the call and handle a `403`:

```ts
try {
  await sdk.entities('order').update(id, changes);
} catch (err: any) {
  if (err.status === 403) {
    // user is missing the required role
  } else throw err;
}
```

## Listing existing roles (admin)

To enumerate the roles defined on a tenant — typically to populate a
role-picker in an admin screen — use the administrator SDK:

```ts
const roles = await sdk.administrator.roles.getExistingRoles();
// e.g. ['admin', 'editor', 'viewer', 'support']
```

`GET /api/roles`. Requires admin authentication.

## Where authorization is enforced

| Resource | How it's enforced |
|---|---|
| Blueprint entities | Per-blueprint `permissions` map (`read`, `create`, `update`, `delete` → required roles) |
| Workspace operations | Workspace role required (`owner`, `admin`, `member`, etc.) |
| Tenant admin endpoints | `admin` tenant role |
| API token management | Cookie or OAuth auth + `tokenAuthenticationPermissions` config |
| Custom plugins / lambdas | Author-defined; plugins receive the resolved user and workspace |

## bypassAdmin

Admins implicitly see "all data" on many list endpoints. To opt out and
fetch only your own scope, pass `bypassAdmin: true` (or send the
`x-bypass-admin: true` header). Useful when the same code path runs as
both an admin and a regular user. See
[Token Refresh / bypassAdmin](/sdk/token_refresh#default-behavior).

## Common patterns

### Require a role in an Express handler

```ts
function requireRole(role: string) {
  return (req, res, next) => {
    const ok = req.qelos?.user?.roles?.includes(role)
      || req.qelos?.workspace?.roles?.includes(role);
    if (!ok) return res.status(403).json({ code: 'FORBIDDEN' });
    next();
  };
}

app.delete('/orders/:id', requireUser(requireRole('admin')), handler);
```

### Hide UI affordances by role

```vue
<button v-if="user.roles.includes('admin')" @click="purge">Purge</button>
```

Always pair UI hiding with a server-side check — clients lie.
