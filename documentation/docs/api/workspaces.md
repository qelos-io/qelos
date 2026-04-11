---
title: Workspaces API
editLink: true
---
# Workspaces API

Endpoints for managing multi-tenant workspaces, including creating, updating, listing, and managing workspace membership.

> **SDK equivalent:** [`sdk.workspaces`](/sdk/managing_workspaces)

## List Workspaces

Retrieve all workspaces the current user has access to.

```
GET /api/workspaces
```

### Response

```json
[
  {
    "_id": "workspace-id",
    "name": "My Workspace",
    "logo": "https://example.com/logo.png",
    "labels": ["team", "project"],
    "isPrivilegedUser": false
  }
]
```

> **SDK:** [`sdk.workspaces.getList()`](/sdk/managing_workspaces#getting-a-list-of-workspaces)

---

## Get Workspace

Retrieve details about a specific workspace.

```
GET /api/workspaces/{workspaceId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `workspaceId` | `string` | The workspace ID |

### Response

```json
{
  "_id": "workspace-id",
  "name": "My Workspace",
  "logo": "https://example.com/logo.png",
  "labels": ["team"],
  "members": [],
  "invites": []
}
```

> **SDK:** [`sdk.workspaces.getWorkspace(workspaceId)`](/sdk/managing_workspaces#getting-a-specific-workspace)

---

## Get Workspace Members

Retrieve the members of a specific workspace.

```
GET /api/workspaces/{workspaceId}/members
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `workspaceId` | `string` | The workspace ID |

### Response

```json
[
  {
    "user": "user-id",
    "roles": ["admin"],
    "created": "2025-01-01T00:00:00.000Z"
  }
]
```

> **SDK:** [`sdk.workspaces.getMembers(workspaceId)`](/sdk/managing_workspaces#getting-workspace-members)

---

## Create Workspace

Create a new workspace.

```
POST /api/workspaces
```

### Request Body

```json
{
  "name": "New Workspace",
  "labels": ["team", "project"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | The workspace name |
| `logo` | `string` | No | URL to the workspace logo |
| `labels` | `string[]` | No | Labels for categorization |

### Response

Returns the created workspace object.

> **SDK:** [`sdk.workspaces.create(workspace)`](/sdk/managing_workspaces#creating-a-new-workspace)

---

## Update Workspace

Update an existing workspace.

```
PUT /api/workspaces/{workspaceId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `workspaceId` | `string` | The workspace ID |

### Request Body

```json
{
  "name": "Updated Name",
  "logo": "https://example.com/new-logo.png"
}
```

Only the fields being changed need to be included.

### Response

Returns the updated workspace object.

> **SDK:** [`sdk.workspaces.update(workspaceId, changes)`](/sdk/managing_workspaces#updating-a-workspace)

---

## Activate Workspace

Set a workspace as the current active workspace for the user.

```
POST /api/workspaces/{workspaceId}/activate
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `workspaceId` | `string` | The workspace ID to activate |

### Response

Returns the activated workspace object.

> **SDK:** [`sdk.workspaces.activate(workspaceId)`](/sdk/managing_workspaces#activating-a-workspace)

---

## Delete Workspace

Remove a workspace.

```
DELETE /api/workspaces/{workspaceId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `workspaceId` | `string` | The workspace ID to delete |

### Response

Returns `200 OK` on success.

> **SDK:** [`sdk.workspaces.remove(workspaceId)`](/sdk/managing_workspaces#removing-a-workspace)

---

## List All Workspaces (Admin)

Retrieve all workspaces across all tenants with optional filtering. This endpoint requires administrator privileges.

```
GET /api/workspaces/all
```

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `members.user` | `string` | Filter workspaces by member user ID (comma-separated for multiple) |
| `labels` | `string` | Filter workspaces that have any of the specified labels (comma-separated) |
| `name` | `string` | Filter workspaces by name (case-insensitive regex match) |
| `q` | `string` | Search workspaces by name or invite details |
| `_id` | `string` | Filter by specific workspace IDs (comma-separated) |
| `select` | `string` | Comma-separated list of fields to return (default: `name logo tenant labels`) |

### Example: Filtered Queries

```
GET /api/workspaces/all?members.user=user123
GET /api/workspaces/all?labels=important,team
GET /api/workspaces/all?name=engineering&select=name,labels,members
GET /api/workspaces/all?q=search+term
GET /api/workspaces/all?_id=id1,id2
```

### Response

```json
[
  {
    "_id": "workspace-id",
    "name": "My Workspace",
    "logo": "https://example.com/logo.png",
    "labels": ["team", "project"]
  }
]
```

::: warning
This endpoint requires administrator authentication. Regular users should use `GET /api/workspaces` instead.
:::

> **SDK:** [`sdkAdmin.adminWorkspaces.getList(filters)`](/sdk/managing_workspaces#getting-list-of-all-workspaces-admin)
