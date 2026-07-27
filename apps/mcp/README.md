# Qelos MCP service

Remote [Model Context Protocol](https://modelcontextprotocol.io) server exposed over Streamable HTTP at `/api/mcp/admin`.

## Dependencies

- Node.js >= 22
- Auth service (`@qelos/auth`) — token validation via `GET /api/me`
- Content service (`@qelos/content`) — tenant `mcp-configuration` and `auth-configuration`

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_SERVICE_PORT` | `9010` | HTTP listen port (falls back to `PORT`) |
| `IP` | `127.0.0.1` | Bind address |
| `AUTH_SERVICE_PORT` | `9000` | Auth service port for `/api/me` |
| `CONTENT_SERVICE_PORT` | `9001` | Content service port for tenant configuration |
| `INTERNAL_SECRET` | — | Shared secret for internal content API calls |
| `REDIS_URL` / `REDIS_HOST` | — | Optional Redis for configuration caching |

## Endpoint

```
POST /api/mcp/admin
GET  /api/mcp/admin
DELETE /api/mcp/admin
```

### Authentication

Every request requires a tenant header and one of:

- `Authorization: Bearer <oauth_access_token>`
- `x-api-key: <tenant api token>` when tenant `auth-configuration.allowUserTokenAuthentication` is `true`

Unauthenticated requests receive `401` with an MCP JSON-RPC error body.

When tenant `mcp-configuration.enabled` is `false`, the service responds with `503`.

### MCP session flow

1. `POST /api/mcp/admin` with an MCP `initialize` JSON-RPC request (no `mcp-session-id` header).
2. Subsequent requests include the `mcp-session-id` response header.
3. `GET /api/mcp/admin` opens the SSE stream for server notifications.
4. `DELETE /api/mcp/admin` terminates the session.

## Development

```sh
pnpm -F @qelos/mcp install
pnpm -F @qelos/mcp dev
```

## Tests

```sh
pnpm -F @qelos/mcp test
```
