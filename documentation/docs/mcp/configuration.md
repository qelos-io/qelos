---
title: MCP Configuration
editLink: true
---

# MCP Configuration

Use **MCP Configuration** in the admin panel to enable Qelos as a remote MCP server for your tenant, control who can connect, and permit OAuth callback URLs for supported AI clients.

The configuration is stored under the `mcp-configuration` key. Only privileged administrators can access it from **Privileged Home**.

## Open MCP Configuration

1. Sign in to the admin panel with a privileged account.
2. Go to **Privileged Home** (the admin-only home tab).
3. Click **MCP Configuration** on the configuration cards grid.

The form has three sections: **General** (server settings), **OAuth** (permitted callback URLs), and **Tools** (exposed tool categories). Tool permissions are covered in [Tools](./tools.md).

::: tip Default posture
MCP ships **disabled**, with **admin-only access** enabled and all tools off. Enable the server and callback URLs first; turn on tools deliberately after you know what each client needs.
:::

## General settings

### Enable MCP server

| Setting | Field | Default |
|---------|-------|---------|
| **Enable MCP server** | `enabled` | `false` |

Turn this on to expose the tenant MCP endpoint at:

<div dir="ltr">

```
https://<your-tenant-domain>/api/mcp/admin
```

</div>

While disabled, remote clients cannot connect and the admin form shows a warning banner. OAuth callback URLs and tool toggles remain editable but have no effect until the server is enabled.

### Admin-only access

| Setting | Field | Default |
|---------|-------|---------|
| **Admin-only access** | `adminOnly` | `true` |

When enabled, only admin or privileged users can complete the OAuth consent flow. Non-admins who attempt to connect see an **Administrator access required** message on the consent screen and cannot grant access.

Use this as your starting posture. Disable it only when you intentionally want non-admin roles to connect MCP clients — and ensure [tool permissions](./tools.md) are scoped accordingly.

### Server name and version

| Setting | Field | Required |
|---------|-------|----------|
| **Server name** | `serverName` | No |
| **Server version** | `serverVersion` | No |

Optional metadata sent to MCP clients during discovery. If left blank, defaults are used. Example values:

<div dir="ltr">

```
Server name:    qelos-mcp
Server version: 1.0.0
```

</div>

These fields do not affect authorization or which tools are exposed.

## Permitted callback URLs

OAuth redirect URIs from MCP clients must appear on the **Permitted callback URLs** list. Only listed URLs are accepted when a client authenticates against your tenant.

When MCP is enabled, **at least one callback URL is required**. Add URLs with **Add callback URL**; remove rows you no longer need.

### Known client patterns

The admin form shows common patterns. Add the exact redirect URI your client uses — it must match character for character.

| Client | Example callback URL |
|--------|----------------------|
| **Cursor** | `cursor://anysphere.cursor-mcp/oauth/callback` |
| **Claude** (Claude.ai, Anthropic domains) | `https://claude.ai/api/mcp/auth_callback` |
| **Codex / ChatGPT** (OpenAI domains) | `https://chatgpt.com/aip/mcp/oauth/callback` |
| **Devin** | `https://app.devin.ai/oauth/callback` |
| **Generic HTTPS** | `https://localhost:6274/oauth/callback` |
| **Custom URI scheme** | `my-app://oauth/callback` |

Claude and Codex/ChatGPT also accept other URLs on their respective domains (for example `*.anthropic.com` or `*.openai.com`). Devin accepts URLs on `*.devin.ai`. When you enter a URL, the form may show a **Matches** hint if it recognizes the client pattern.

::: warning Add before connecting
If a client’s redirect URI is not on this list, authentication fails even when MCP is enabled and the user is an admin. Add the URI here before following [client setup steps](./clients.md).
:::

### Validation rules

The admin form validates callback URLs on save:

| Rule | Error |
|------|-------|
| MCP enabled with zero URLs | At least one callback URL is required when MCP is enabled |
| Duplicate entries | Duplicate callback URLs are not allowed |
| Empty row | Callback URL is required (per row) |
| Invalid format | Invalid callback URL format |

**Valid formats:**

- **HTTPS URLs** — must parse as a valid URL (for example `https://example.com/oauth/callback`).
- **Custom URI schemes** — must match `scheme://…` where the scheme starts with a letter and uses allowed characters (for example `cursor://…`, `my-app://oauth/callback`).

URLs are trimmed before save; empty rows are dropped.

## OAuth consent flow

When a user connects an MCP client, the client opens a browser window to your tenant’s authorization page at **`/mcp/authorize`**.

### What the user sees

1. **Sign in** — if not already authenticated, the user is redirected to login and returned to the consent screen.
2. **Consent details** — the screen shows:
   - **Client** — recognized name when possible (Cursor, Claude, Codex / ChatGPT, Devin) or a formatted callback target
   - **Callback URL** — the OAuth redirect URI the client requested
   - **Client ID** — when provided by the client
   - **Requested scopes** — when the client requests scopes
3. **Accept or Deny** — the user grants or refuses access.

On **Accept**, the browser redirects back to the client’s callback URL and the MCP session can proceed. On **Deny**, the client receives an access-denied result.

No manual token copy-paste is required for standard client setups — the browser handles consent and redirect.

### When consent is blocked

| Condition | What the user sees |
|-----------|-------------------|
| MCP disabled | MCP is disabled — remote clients cannot connect |
| Admin-only + non-admin user | Administrator access required |
| Invalid or expired request | Authorization unavailable — start again from the MCP client |
| Missing authorization state | Missing authorization state — start again from the MCP client |

Fix configuration in this panel (enable MCP, add callback URL, adjust admin-only) and retry from the client.

## Save configuration

Click **Save** at the bottom of the form. Validation runs on callback URLs before the configuration is persisted.

After saving:

- Confirm **Enabled** and **Admin only** tags on the form header match your intent.
- Add client-specific callback URLs before users connect — see [Clients](./clients.md).
- Enable and scope tool categories — see [Tools](./tools.md).

## Related documentation

- [MCP overview](./index.md) — prerequisites and endpoint URL
- [Tools](./tools.md) — exposed tool categories and role restrictions
- [Clients](./clients.md) — connect Cursor, Claude, ChatGPT, Devin, and others
- [Permissions & Roles](/auth/permissions-roles) — how Qelos roles map to access
