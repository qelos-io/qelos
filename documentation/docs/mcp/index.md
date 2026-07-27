---
title: MCP
editLink: true
---

# Model Context Protocol (MCP)

Qelos exposes your tenant as a **remote MCP server** so external AI clients — Cursor, Claude, ChatGPT, Devin, and others — can call tenant-scoped tools against your data, users, agents, events, and more.

The MCP endpoint is tenant-specific. Once enabled and configured in the admin panel, clients connect to:

<div dir="ltr">

```
https://<your-tenant-domain>/api/mcp/admin
```

</div>

## Who is this for?

- **Tenant admins** — enable the MCP server, permit OAuth callback URLs, and choose which tool categories are exposed to which roles.
- **Developers** — connect your preferred AI client to your Qelos tenant and use natural-language prompts to inspect or manage tenant resources.

Authentication is handled through a browser consent screen: when a client connects, you sign in and accept or deny access. No manual token wiring is required for standard client setups.

## Prerequisites

Before connecting an AI client, confirm the following in **Privileged Home → MCP Configuration**:

- [ ] **MCP server enabled** — remote clients cannot connect while MCP is disabled.
- [ ] **At least one permitted callback URL** — must match the OAuth redirect URI of the client you plan to use (for example, Cursor or Claude).
- [ ] **Desired tools enabled** — tool categories are disabled by default; enable only what your users need and scope them by role.

::: tip Default posture
MCP ships disabled with **admin-only access** enabled and all tools off. Start there, then expand deliberately as you understand what each client needs.
:::

## What MCP exposes

Through permitted tool categories, connected clients can interact with tenant resources such as:

- **Blueprints** — list data models and query or create entities
- **Users, workspaces, permissions** — membership and access context
- **Configurations, content, storage** — tenant settings and assets
- **Events** — audit log and platform activity
- **Agents, plugins, integrations, secrets** — AI and third-party connectivity

Available actions depend on your admin configuration and the connecting user's role. See [Permissions & Roles](/auth/permissions-roles) for how Qelos roles map to access.

## Documentation

| Topic | Description |
|-------|-------------|
| [Configuration](./configuration.md) | Admin-panel setup: enable the server, admin-only mode, OAuth callback URLs, validation rules, and the browser consent flow |
| [Tools](./tools.md) | Tool categories, role and workspace restrictions, and recommended starting configs |
| [Clients](./clients.md) | Connect from Cursor, Claude, ChatGPT, Devin, and other MCP clients |
| [Examples & Ideas](./examples.md) | Prompts, expected outcomes, and workflow ideas once connected |
