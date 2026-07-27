---
title: MCP Examples & Ideas
editLink: true
---

# MCP Examples & Ideas

Once your AI client is connected to Qelos, you interact through **natural-language prompts**. The client discovers available MCP tools from your tenant and calls them on your behalf.

::: warning Outcomes depend on configuration
Every example below assumes the relevant tool categories are **enabled** and your user **passes authorization** — admin-only mode, role filters, workspace scoping, and admin-privileged tools. If a prompt fails or the client says a tool is unavailable, review [Permitted tools](./tools.md) and your role in [Permissions & Roles](/auth/permissions-roles).
:::

## Worked examples

Each example shows a sample prompt, the MCP tools the client is likely to invoke, and an abbreviated outcome. Exact wording and tool order vary by client.

### List blueprints and summarize entity counts

**Prompt**

> List all blueprints on this tenant and give me a count of entities in each one.

**Likely MCP tools**

1. `list-blueprints` — fetch blueprint definitions
2. `get-blueprint-entities` — called once per blueprint (often with a low `limit` or a count-oriented query)

**Sample outcome**

```json
[
  { "key": "products", "title": "Products", "entityCount": 142 },
  { "key": "orders", "title": "Orders", "entityCount": 891 },
  { "key": "customers", "title": "Customers", "entityCount": 310 }
]
```

The client may present this as a table or bullet summary. Large tenants may paginate entity queries — ask the client to cap results if needed.

**Requires:** `blueprints` category enabled for your role.

---

### Recent error events (last 24 hours)

**Prompt**

> Show error events from the last 24 hours. Group by event name and highlight anything related to payments or checkout.

**Likely MCP tools**

1. `list-events` — with filters such as `kind`, `eventName`, or `search` (exact parameters depend on how the client interprets "error" and the time window)

**Sample outcome**

```json
{
  "total": 7,
  "groups": [
    { "eventName": "checkout.failed", "count": 4, "latest": "2026-07-27T18:42:00Z" },
    { "eventName": "provider.webhook.error", "count": 2, "latest": "2026-07-27T16:10:00Z" },
    { "eventName": "entity.validation.failed", "count": 1, "latest": "2026-07-27T09:05:00Z" }
  ],
  "paymentRelated": ["checkout.failed", "provider.webhook.error"]
}
```

**Requires:** `events` category enabled; connecting user must be **privileged** (`list-events` is admin-only).

---

### Create a product entity

**Prompt**

> Create a new product in the products blueprint with name "Wireless Keyboard", SKU "WK-100", price 79.99, and status "draft".

**Likely MCP tools**

1. `list-blueprints` — confirm the `products` blueprint key (optional if the client already knows it)
2. `create-blueprint-entity` — with `blueprintKey: "products"` and a `metadata` object matching your blueprint fields

**Sample outcome**

```json
{
  "id": "687f2a1b4e5d6c7a8b9c0d1e",
  "blueprintKey": "products",
  "metadata": {
    "name": "Wireless Keyboard",
    "sku": "WK-100",
    "price": 79.99,
    "status": "draft"
  },
  "createdAt": "2026-07-27T20:15:00Z"
}
```

Entity creation still respects blueprint-level permissions in Qelos — MCP does not bypass [Permissions & Roles](/auth/permissions-roles). If creation fails, check that your role can create entities on that blueprint.

**Requires:** `blueprints` category enabled; `create-blueprint-entity` available in that category.

---

### Which integration sources are configured?

**Prompt**

> Which integration sources are configured on this tenant? List them by kind.

**Likely MCP tools**

1. `list-integration-sources` — optionally filtered by `kind` if you name a specific provider

**Sample outcome**

```json
[
  { "id": "src_paddle", "kind": "paddle", "name": "Paddle Billing", "status": "active" },
  { "id": "src_slack", "kind": "slack", "name": "Slack Notifications", "status": "active" },
  { "id": "src_stripe", "kind": "stripe", "name": "Stripe (sandbox)", "status": "inactive" }
]
```

**Requires:** `integrations` category enabled; privileged user (`list-integration-sources` is admin-only).

---

### Workspaces and labels

**Prompt**

> List the workspaces I belong to and show each workspace's labels.

**Likely MCP tools**

1. `list-workspaces` — returns workspaces visible to the authenticated user, including label metadata when present

**Sample outcome**

```json
[
  { "id": "ws_acme", "name": "Acme Corp", "labels": ["enterprise", "us-east"] },
  { "id": "ws_demo", "name": "Demo Sandbox", "labels": ["internal"] }
]
```

When workspaces are inactive on the tenant, this tool may return an empty list or a single default context depending on your app configuration.

**Requires:** `workspaces` category enabled for your role.

---

### App configuration snapshot

**Prompt**

> What is the current app configuration? Summarize enabled modules and any workspace settings.

**Likely MCP tools**

1. `get-app-config` — tenant app configuration metadata
2. `list-configurations` — optional follow-up if the client needs named configuration documents (admin only)

**Sample outcome**

```json
{
  "appName": "Acme Portal",
  "modules": { "workspaces": true, "payments": true, "ai": true },
  "workspaceConfiguration": { "isActive": true, "defaultRole": "member" }
}
```

**Requires:** `configurations` category enabled. `get-app-config` is available to any user who passes category filters; `list-configurations` requires a privileged user.

---

## Workflow ideas

These are multi-step patterns you can run in a single conversation once the right categories are enabled.

### Incident triage via events

Use when production issues need fast context without opening the admin panel.

1. **Pull recent failures** — prompt for error or warning events in the last few hours (`list-events`).
2. **Correlate with data** — ask the client to cross-reference affected blueprint entities (`get-blueprint-entities`) or integration sources (`list-integration-sources`).
3. **Summarize** — request a timeline, affected users or orders, and suggested next checks.

**Suggested tool config:** enable `events` and `blueprints` (and optionally `integrations`) for admin roles only. See the [incident triage preset](./tools.md#incident-triage-events-for-admins) in Permitted tools.

### Content audit

Use when reviewing drafts, published pages, or configuration drift before a release.

1. **Inventory blueprints** — list content-related blueprints and entity counts (`list-blueprints`, `get-blueprint-entities`).
2. **Check app config** — confirm feature flags and module toggles (`get-app-config`).
3. **Flag gaps** — ask the client to find entities missing required fields or stuck in `draft` status.

**Suggested tool config:** enable `blueprints` and `configurations` for admin or editor roles. The `content` category has no registered tools yet — blueprint entities often hold the content you need today.

### Tenant onboarding checklist

Use when standing up a new tenant and verifying baseline setup.

1. **Configuration** — confirm app name, modules, and workspace mode (`get-app-config`, optionally `list-configurations`).
2. **Data models** — list blueprints and verify expected keys exist (`list-blueprints`).
3. **Integrations** — confirm payment or notification sources are wired (`list-integration-sources`).
4. **Access** — list workspaces and membership context (`list-workspaces`); optionally list users if onboarding admins (`list-users`).

**Suggested tool config:** start with admin-only access and enable `configurations`, `blueprints`, `integrations`, and `workspaces` for the `admin` role only. Expand after the tenant is stable.

---

## Tips for better prompts

- **Name the blueprint** when querying or creating entities — use the blueprint **key** (for example `products`), not just the display title.
- **Scope time windows** for events — "last 24 hours" or "since yesterday" helps the client choose sensible `list-events` filters.
- **Ask for summaries** — clients handle large JSON responses better when you request tables, counts, or top-N lists instead of raw dumps.
- **Iterate** — if the first response is incomplete, follow up with a narrower prompt rather than repeating the same question.

## Related documentation

- [Permitted tools](./tools.md) — which categories and roles unlock each example
- [Client setup](./clients.md) — connect Cursor, Claude, ChatGPT, or Devin before trying these prompts
- [Configuration](./configuration.md) — enable MCP and callback URLs in the admin panel
- [Create Blueprints](/getting-started/create-blueprints) — blueprint keys and entity structure
- [AI Agents](/ai/agents) — configure agents separately from MCP tool access
