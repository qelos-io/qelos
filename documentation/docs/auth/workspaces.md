---
title: Workspace-Scoped Auth
editLink: true
---

# Workspace-Scoped Auth

Qelos is multi-tenant in two layers:

- **Tenants** isolate organizations.
- **Workspaces** scope data and permissions inside a tenant.

Every authenticated request runs with at most one *active workspace*.
This page covers how the active workspace is selected, how to switch
between workspaces, and how workspace scope interacts with each auth
mode.

## How the active workspace is chosen

The active workspace is part of the auth state, not a per-request
parameter. It is set by:

1. **Signin / signup.** If the user has exactly one workspace, it
   becomes active automatically. Otherwise the first workspace
   returned by `sdk.workspaces.getList()` is used as a default.
2. **Explicit activation.** `sdk.workspaces.activate(workspaceId)`
   issues a new token / cookie scoped to the chosen workspace.
3. **Token claim.** OAuth and cookie tokens encode the workspace id;
   refreshing rotates the token but preserves the workspace.
4. **API tokens.** If created with a `workspace`, the token is locked
   to that workspace for its entire lifetime.

The auth payload (`payload.workspace`) tells you which workspace the
session is currently bound to.

## Listing and switching

```ts
const workspaces = await sdk.workspaces.getList();
// [{ _id, name, roles, labels, ... }, ...]

await sdk.workspaces.activate(workspaceId);
// subsequent requests use the new workspace
```

`POST /api/workspaces/:id/activate` returns a fresh token / cookie pair.
The SDK swaps it in transparently — no need to re-init.

In the integrator middleware, the active workspace is populated for
you:

```ts
app.get('/dashboard', requireUser(async (req, res) => {
  const { workspace, workspaces } = req.qelos;
  // workspace  — current
  // workspaces — full list for the user
  res.render('dashboard', { workspace, workspaces });
}));
```

To override which workspace the middleware picks per request, pass
`resolveWorkspace`:

```ts
createQelosMiddleware({
  config: { appUrl, requireAuth: true },
  resolveWorkspace: ({ req, workspaces }) => {
    const requested = req.headers['x-workspace-id'];
    return workspaces.find(w => w._id === requested) ?? workspaces[0] ?? null;
  },
});
```

This *picks* the workspace for the current request's SDK; it does not
re-issue the workspace-bound token. Use `sdk.workspaces.activate()` for
durable switches.

## Workspace lock by auth mode

| Mode | Switchable mid-session? |
|---|---|
| Cookie session | Yes — `sdk.workspaces.activate(id)` rotates the cookie. |
| OAuth | Yes — `sdk.workspaces.activate(id)` returns a new token pair. |
| API token (no scope) | Yes — but typically you want a scoped token instead. |
| API token (workspace-scoped) | **No.** Activation calls fail with `403`. |

Workspace-scoped API tokens are the right choice for jobs that should
*only* ever touch one workspace's data — for example, a per-customer
deployment pipeline.

## Membership operations

```ts
// list members
const members = await sdk.workspaces.getMembers(workspaceId);

// create a workspace
const ws = await sdk.workspaces.create({ name: 'Acme Co' });

// invite (via the invites SDK)
await sdk.invites.create({ email: 'new@acme.test', workspace: ws._id });

// update / remove
await sdk.workspaces.update(ws._id, { logo: 'https://...' });
await sdk.workspaces.remove(ws._id);
```

See [Managing Workspaces](/sdk/managing_workspaces) and
[Managing Invites](/sdk/managing_invites) for the full surface.

## Workspace roles

Roles attached to a workspace member apply only inside that workspace.
A user can be `admin` of workspace A and `viewer` of workspace B with
the same account. `IWorkspaceMember.roles` and `payload.workspace.roles`
both expose this list. See [Permissions and Roles](./permissions-roles).

## isPrivilegedUser

`IWorkspace.isPrivilegedUser` is a convenience flag set on each
workspace returned to the current user — `true` when they are the
owner / have full administrative rights on the workspace. Use it for UI
gating; do not rely on it for authorization (that's enforced
server-side regardless).
