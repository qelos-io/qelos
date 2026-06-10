# Integrators (@qelos/integrator-*)

Framework middleware that turns an external app into a same-origin BFF for Qelos—resolve signed-in user, attach per-request SDK, and proxy `/api/**` to the managed Qelos instance.

## What Developers Can Do

- **Identify users**: Resolve Qelos user and active workspace on every request
- **Use per-request SDK**: Access `req.qelos.sdk` (or framework equivalent) wired to inbound cookies
- **Proxy API calls**: Forward `/api/**` to Qelos without CORS or cross-site cookie issues
- **Require auth**: Protect selected routes when configured
- **Handle social auth**: Complete OAuth callbacks with cookie domain rewriting

## Supported Frameworks

| Package | Integration |
|---------|-------------|
| `@qelos/integrator-express` | `createQelosIntegrator({ config })` → middleware + proxy |
| `@qelos/integrator-next` | Edge middleware + App Router API proxy handlers |
| `@qelos/integrator-nuxt` | Nuxt module + `useQelos()` composable |
| `@qelos/integrator-fastify` | `qelosFastify` plugin with preHandler guards |
| `@qelos/integrator-nest` | `QelosModule.forRoot()` with decorators and guards |

Scaffold via: `qelos init --framework <express|next|nuxt|fastify|nest>`

## Shared Configuration

| Option | Purpose |
|--------|---------|
| `appUrl` | Managed Qelos app URL |
| `apiToken` | Server-side API token (optional) |
| `requireAuth` | Return 401 on protected routes |
| `skipPaths` | Paths bypassing auth check |
| `disableProxy` | Disable built-in `/api/**` proxy |
| `resolveWorkspace` | Custom workspace resolution hook |

## Request Context

Each framework exposes:
- **User** — Signed-in Qelos user profile
- **Workspace** — Active workspace
- **Workspaces** — All user workspaces
- **SDK** — Per-request `@qelos/sdk` instance

## Environment Variables

- `QELOS_APP_URL` — Qelos app URL
- `QELOS_PROXY_TARGET` — Dev proxy target override
- `QELOS_IP` — Bind address for dev proxy

## Related

- [SDK](../sdk/PRODUCT.md)
- [CLI](../cli/PRODUCT.md)
- [Gateway API](../api/gateway.md)
