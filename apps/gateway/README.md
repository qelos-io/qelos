# Qelos gateway

API gateway and tenant-aware reverse proxy for Qelos microservices.

## Dependencies

- Node.js
- pnpm
- Redis
- Downstream Qelos services (auth, content, admin panel, etc.)

## Proxy routes

Service upstreams are configured in `server/services/proxy-middleware/config.ts`. Each service uses `{NAME}_SERVICE_URL`, `{NAME}_SERVICE_PORT`, and optional `{NAME}_SERVICE_PROXIES` env vars.

| Service | Default port | Gateway prefix |
|---------|--------------|----------------|
| Auth | 9000 | `/api/auth`, `/api/signin`, `/api/me`, … |
| Content | 9001 | `/api/blocks`, `/api/configurations`, … |
| AI | 9007 | `/api/ai` |
| MCP | 9010 | `/api/mcp` |
| Payments | 9008 | `/api/plans`, `/api/subscriptions`, … |
| Plugins | 9006 | `/api/plugins`, `/api/events`, `/api`, … |

MCP clients connect at `{tenantHost}/api/mcp/admin` (proxied to `@qelos/mcp`).

OAuth discovery metadata (e.g. `/.well-known/oauth-authorization-server`) is **not** under `/api/mcp`; when implemented it belongs on the auth service and must be listed in `authService.proxies`, not `mcpService.proxies`.

## Environment variables (local dev)

```sh
MCP_SERVICE_PORT=9010
AI_SERVICE_PORT=9007
AUTH_SERVICE_PORT=9000
CONTENT_SERVICE_PORT=9001
```

## Usage

### As a Docker container

```sh
docker run -p 3000:3000 qelos/gateway
```

## Development

```sh
pnpm install
pnpm -F @qelos/gateway dev
```
