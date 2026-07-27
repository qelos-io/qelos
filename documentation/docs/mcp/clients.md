---
title: MCP Client Setup
editLink: true
---

# MCP Client Setup

Connect external AI clients to your Qelos tenant as a **remote MCP server**. Each client uses OAuth: when you connect, the client opens a browser window to your tenant's consent screen — sign in, review the request, and click **Accept** to grant access.

Before connecting any client, complete the admin prerequisites in [Configuration](./configuration.md):

- [ ] MCP server **enabled**
- [ ] Client **callback URL** on the permitted list
- [ ] Desired **tool categories** enabled for your role — see [Permitted tools](./tools.md)

## Server URL

Every supported client connects to the same tenant endpoint:

<div dir="ltr">

```
https://<your-tenant-domain>/api/mcp/admin
```

</div>

Replace `<your-tenant-domain>` with your Qelos tenant host (for example `acme.qelos.app`). The URL is the same for all clients — only the OAuth callback URI differs per client.

## Cursor

[Cursor](https://cursor.com) supports remote MCP servers with browser-based OAuth.

### 1. Permit the callback URL

In **Privileged Home → MCP Configuration**, add:

<div dir="ltr">

```
cursor://anysphere.cursor-mcp/oauth/callback
```

</div>

This is Cursor's fixed redirect URI. It must match exactly.

### 2. Add the remote server

**Option A — config file (recommended for teams)**

Create or edit `.cursor/mcp.json` in your project root (or `~/.cursor/mcp.json` for a global setup):

<div dir="ltr">

```json
{
  "mcpServers": {
    "qelos": {
      "url": "https://<your-tenant-domain>/api/mcp/admin"
    }
  }
}
```

</div>

**Option B — Settings UI**

1. Open **Cursor Settings** → **Tools & MCP** (or **Settings → MCP**).
2. Click **Add server** / **New MCP server**.
3. Choose a remote server and enter the URL above.

### 3. Authenticate

1. Save the config or add the server in Settings.
2. If the server shows **Needs authentication**, click **Connect** (or trigger a Qelos tool from chat).
3. Your browser opens the Qelos consent screen at `/mcp/authorize`.
4. Sign in with an admin account (when [admin-only access](./configuration.md#admin-only-access) is enabled).
5. Review the client name, callback URL, and scopes — click **Accept**.
6. The browser redirects to `cursor://…` and Cursor completes the OAuth handshake.

After success, Qelos tools appear under the `qelos` server in **Tools & MCP**.

::: tip Project vs global config
Use `.cursor/mcp.json` in a repo to share the server URL with your team. Each developer still completes their own browser consent on first connect.
:::

## Claude (Claude.ai, Claude Code, Cowork)

Anthropic clients connect to remote MCP servers through custom connectors. The redirect URI must be on your tenant's permitted list.

### 1. Permit the callback URL

Add the redirect URI your Claude product uses. The most common pattern:

<div dir="ltr">

```
https://claude.ai/api/mcp/auth_callback
```

</div>

Other URLs on `claude.ai` or `*.anthropic.com` are also recognized by the admin form's client hint. Add the **exact** URI shown in your connector settings — character for character.

| Product | Typical setup location |
|---------|------------------------|
| **Claude.ai** (web) | Settings → Connectors → Add custom connector / remote MCP |
| **Claude Code** | MCP or integrations settings — add remote server URL |
| **Cowork** | Workspace integrations — add remote MCP connector |

UI labels vary by release; look for **custom connector**, **remote MCP**, or **MCP server URL**.

### 2. Add the Qelos server

1. Open your Claude product's connector or MCP settings.
2. Add a **remote MCP** or **custom connector**.
3. Enter the server URL:

<div dir="ltr">

```
https://<your-tenant-domain>/api/mcp/admin
```

</div>

4. Confirm the redirect URI matches what you added in the admin panel.

### 3. Authenticate

1. Save the connector and start a connection (or use a feature that calls MCP tools).
2. Claude opens a browser window to your tenant consent screen.
3. Sign in and click **Accept**.
4. The browser redirects to the Claude callback URL; the client stores the session and lists available tools.

## Codex / ChatGPT

OpenAI's ChatGPT and Codex surfaces support remote MCP connectors with OAuth.

### 1. Permit the callback URL

In **MCP Configuration**, add:

<div dir="ltr">

```
https://chatgpt.com/aip/mcp/oauth/callback
```

</div>

URLs on `chatgpt.com` or `*.openai.com` match the admin **Codex / ChatGPT** hint. Use the exact redirect URI from your connector configuration.

### 2. Add the Qelos server

1. Open ChatGPT **Settings** (or your Codex / developer MCP settings).
2. Find **Connectors**, **Apps**, or **MCP servers** — add a **remote MCP** entry.
3. Enter:

<div dir="ltr">

```
https://<your-tenant-domain>/api/mcp/admin
```

</div>

4. Ensure the OAuth redirect URI in the connector matches your permitted list entry.

### 3. Authenticate

1. Enable or connect the Qelos MCP server in ChatGPT/Codex.
2. When prompted, complete sign-in in the browser consent screen.
3. Click **Accept** to grant access.
4. Return to ChatGPT — Qelos tools should be available for the session.

## Devin

[Devin](https://devin.ai) connects to remote MCP servers for tenant-aware automation.

### 1. Permit the callback URL

Add Devin's OAuth redirect URI:

<div dir="ltr">

```
https://app.devin.ai/oauth/callback
```

</div>

Other URLs on `*.devin.ai` are recognized by the admin form. Add the exact URI Devin displays in its MCP setup.

### 2. Add the Qelos server

1. In Devin, open **Settings** or **Integrations** → **MCP** (or **Remote MCP**).
2. Add a new remote MCP server.
3. Set the URL to:

<div dir="ltr">

```
https://<your-tenant-domain>/api/mcp/admin
```

</div>

### 3. Authenticate

1. Save the server configuration and initiate connection.
2. Devin opens a browser to your tenant's `/mcp/authorize` consent screen.
3. Sign in with an account that passes [admin-only](./configuration.md#admin-only-access) and [tool](./tools.md) checks.
4. Click **Accept** — Devin receives the OAuth callback and registers Qelos tools.

## Other MCP clients

Any client that supports remote MCP with OAuth can connect if:

1. Its redirect URI is added to **Permitted callback URLs** (HTTPS or custom URI scheme — see [Configuration](./configuration.md#permitted-callback-urls)).
2. The client is pointed at `https://<your-tenant-domain>/api/mcp/admin`.
3. The connecting user completes browser consent.

For custom clients built on `@qelos/sdk`, see the SDK's MCP auth helpers — that path is for advanced integrations, not standard admin setup.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Connection fails immediately; no consent screen | MCP server disabled | Enable **Enable MCP server** in [MCP Configuration](./configuration.md) and save |
| OAuth error; redirect rejected | Callback URL not permitted | Add the client's **exact** redirect URI to permitted callback URLs |
| Consent shows **Administrator access required** | Admin-only mode + non-admin user | Sign in as admin/privileged user, or disable admin-only and scope [tools](./tools.md) |
| Consent succeeds but no tools in client | No tool categories enabled for user's role | Enable categories in the Tools table; match the user's [role](/auth/permissions-roles) |
| Tool calls fail with permission errors | Role / workspace filters too narrow | Widen **Roles**, **Workspace roles**, or **Workspace labels** for the category — or use an account that matches |
| **Authorization unavailable** or expired request | Stale OAuth state | Start again from the client — do not refresh the consent URL manually |
| **Missing authorization state** | Broken redirect back to client | Retry from the MCP client; confirm callback URL matches permitted list exactly |
| Works for admin, not for editors | Admin-only still enabled | Disable admin-only only after scoping tools for non-admin roles |
| Workspace-scoped tools missing | Workspaces inactive or labels don't match | Enable workspaces in tenant config; adjust wsRoles/wsLabels — see [Tools](./tools.md#workspace-columns-when-workspaces-are-inactive) |

::: warning Check admin first
Most connection failures trace back to [Configuration](./configuration.md) — MCP disabled, missing callback URL, or admin-only blocking the signing-in user. Confirm those before debugging client-side settings.
:::

## Next steps

Once connected, try natural-language prompts against your tenant — see [Examples & Ideas](./examples.md).

## Related documentation

- [MCP overview](./index.md) — prerequisites and endpoint URL
- [Configuration](./configuration.md) — enable server, callback URLs, consent flow
- [Permitted tools](./tools.md) — tool categories and role restrictions
- [Permissions & Roles](/auth/permissions-roles) — tenant and workspace roles
