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

## Add Workspace Member

Add a new member to a workspace. Requires workspace admin privileges.

```
POST /api/workspaces/{workspaceId}/members
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `workspaceId` | `string` | The workspace ID |

### Request Body

```json
{
  "userId": "user-id",
  "roles": ["member"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `userId` | `string` | Yes | The user ID to add |
| `roles` | `string[]` | Yes | Roles to assign (e.g., `["admin", "user"]` or `["member"]`) |

### Response

```json
{
  "message": "Member added successfully.",
  "workspace": { ... }
}
```

---

## Update Workspace Member

Update the roles of an existing workspace member. Requires workspace admin privileges.

```
PUT /api/workspaces/{workspaceId}/members/{userId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `workspaceId` | `string` | The workspace ID |
| `userId` | `string` | The user ID to update |

### Request Body

```json
{
  "roles": ["admin", "user"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `roles` | `string[]` | Yes | New roles for the member |

### Response

```json
{
  "message": "Member roles updated successfully.",
  "updatedMember": {
    "user": "user-id",
    "roles": ["admin", "user"]
  },
  "workspaceId": "workspace-id"
}
```

---

## Remove Workspace Member

Remove a member from a workspace. Requires workspace admin privileges.

```
DELETE /api/workspaces/{workspaceId}/members/{userId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `workspaceId` | `string` | The workspace ID |
| `userId` | `string` | The user ID to remove |

### Response

```json
{
  "message": "Member removed from workspace.",
  "removedMemberId": "user-id",
  "userId": "user-id"
}
```

---

## List All Workspaces (Admin)

Retrieve all workspaces within the current tenant with optional filtering. This endpoint requires administrator privileges.

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

---

## Get Encrypted Workspace Data (Admin)

Retrieve encrypted data stored for a workspace. Requires administrator privileges.

```
GET /api/workspaces/{workspaceId}/encrypted
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `workspaceId` | `string` | The workspace ID |

### Headers

| Header | Type | Description |
|---|---|---|
| `x-encrypted-id` | `string` | Optional encrypted data identifier |

### Response

Returns the stored encrypted data as JSON, or `null` if no data is found.

> **SDK:** [`sdkAdmin.adminWorkspaces.getEncryptedData(workspaceId, encryptedId)`](/sdk/managing_workspaces#working-with-encrypted-workspace-data)

---

## Set Encrypted Workspace Data (Admin)

Store encrypted data for a workspace. Requires administrator privileges.

```
POST /api/workspaces/{workspaceId}/encrypted
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `workspaceId` | `string` | The workspace ID |

### Headers

| Header | Type | Description |
|---|---|---|
| `x-encrypted-id` | `string` | Optional encrypted data identifier |

### Request Body

Any valid JSON object to be stored as encrypted data.

```json
{
  "apiKey": "secret-key",
  "webhookSecret": "webhook-secret"
}
```

### Response

Returns `200 OK` with empty object on success.

> **SDK:** [`sdkAdmin.adminWorkspaces.setEncryptedData(workspaceId, encryptedId, data)`](/sdk/managing_workspaces#working-with-encrypted-workspace-data)
