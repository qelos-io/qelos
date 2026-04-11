---
title: Invites API
editLink: true
---
# Invites API

Endpoints for managing workspace invitations. Users can view, accept, or decline invitations to join workspaces.

> **SDK equivalent:** [`sdk.invites`](/sdk/managing_invites)

## List Invites

Retrieve all pending invitations for the current user.

```
GET /api/invites
```

### Response

```json
[
  {
    "workspace": {
      "_id": "workspace-id",
      "name": "Engineering Team",
      "logo": "https://example.com/logo.png"
    }
  }
]
```

> **SDK:** [`sdk.invites.getList()`](/sdk/managing_invites#getting-a-list-of-invites)

---

## Accept Workspace Invitation

Accept an invitation to join a workspace.

```
POST /api/invites
```

### Request Body

```json
{
  "workspace": "workspace-id",
  "kind": "accept"
}
```

### Response

Returns `200 OK` on success.

> **SDK:** [`sdk.invites.acceptWorkspace(workspaceId)`](/sdk/managing_invites#accepting-a-workspace-invitation)

---

## Decline Workspace Invitation

Decline an invitation to join a workspace.

```
POST /api/invites
```

### Request Body

```json
{
  "workspace": "workspace-id",
  "kind": "decline"
}
```

### Response

Returns `200 OK` on success.

> **SDK:** [`sdk.invites.declineWorkspace(workspaceId)`](/sdk/managing_invites#declining-a-workspace-invitation)
