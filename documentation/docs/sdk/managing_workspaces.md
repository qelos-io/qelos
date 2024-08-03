---
title: Managing Workspaces
---

# {{ $frontmatter.title }}

This section covers how to manage workspaces using the Qelos SDK. The provided examples demonstrate how to call an API endpoint and retrieve a list of workspaces, allowing administrators to efficiently handle workspace-related tasks.

---

# Admin Workspaces

## Calling an API Endpoint

To call a specific API endpoint for workspace-related operations, you can use the following code:

```bash
const response = await sdkAdmin.adminWorkspaces.callApi('/endpoint', { method: 'GET' });
```

## Getting List of Workspaces

To retrieve a list of all workspaces, use the following code:

```bash
const workspaces = await sdkAdmin.adminWorkspaces.getList();

```
