# @qelos/integrator-nest

NestJS module for [Qelos](https://qelos.io). It wires global middleware so your Nest host acts as a same-origin BFF for a managed Qelos app: requests under `/api/**` are proxied to Qelos (unless you opt out), and every other request resolves the current user up front so controllers and request-scoped providers can use `request.qelos` and the `Qelos*` decorators.

Works with Nest’s **Express** and **Fastify** HTTP adapters — request/response objects are handled generically.

## Install

```sh
pnpm add @qelos/integrator-nest @qelos/sdk
pnpm add @nestjs/common @nestjs/core
```

Requires **Node 18+**. The user-resolution middleware uses [`Response.headers.getSetCookie()`](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie) when probing `/api/me` so each upstream `Set-Cookie` can be forwarded individually.

## Quick start

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { QelosModule } from '@qelos/integrator-nest';

@Module({
  imports: [
    QelosModule.forRoot({
      config: {
        appUrl: process.env.QELOS_APP_URL!, // managed Qelos app origin
      },
    }),
  ],
})
export class AppModule {}
```

`forRoot` registers:

1. **`QelosMiddleware`** on `*` — resolves `request.qelos` via `/api/me` cookie pass-through (unless the path is skipped).
2. **`QelosProxyMiddleware`** on `api/*splat` — reverse-proxies `/api/**` to the same resolved origin, unless `disableProxy: true`.

User-defined controllers and routes still take precedence for paths they own; the proxy only handles `/api/**` traffic that reaches the middleware stack.

To narrow where the **resolver** runs, import the module and apply `QelosMiddleware` yourself (see Nest docs on `MiddlewareConsumer`). You still need `QELOS_MODULE_OPTIONS` and `QelosProxyMiddleware` provided if you split registration.

## API proxy

The proxy forwards the inbound request (method, URL path + query, body stream, and headers except hop-by-hop) to `<proxyTarget>` + the same path. Upstream `Set-Cookie` headers are rewritten so `Domain=` matches the inbound `Host` (port stripped), making Qelos session cookies first-party on your Nest host.

### Resolving the proxy target

The managed app URL (`config.appUrl`) is the default target. Env vars are dev-time overrides when `appUrl` is not reachable from localhost:

1. `QELOS_PROXY_TARGET`
2. `QELOS_IP`
3. `QELOS_API_IP`
4. `config.appUrl`

Whitespace-only env values are ignored. If nothing resolves, the proxy responds with **503**. The user resolver uses the same chain; without a target and without `apiToken`, anonymous requests are allowed unless `requireAuth` is set.

### Opting out

Set `disableProxy: true` in config to skip registering `QelosProxyMiddleware` — for example when you implement every `/api/*` route in Nest or terminate the proxy elsewhere.

WebSocket upgrades are **not** proxied.

## User-resolution middleware

On non-skipped paths, the middleware:

1. Builds a per-request SDK (`createRequestSdk`) — with `apiToken`, static auth; otherwise `extraHeaders` forwards the live `Cookie` and `Authorization` headers on every SDK call.
2. Resolves the proxy target (same priority as above).
3. If there is no target and no `apiToken`, returns anonymous context (or **401** when `requireAuth` is true).
4. If there is a target, `GET ${target}/api/me` with cookies and authorization forwarded. Each upstream `Set-Cookie` is appended to the outgoing response with `Domain=` rewritten to the inbound host.
5. On success, loads workspaces via `sdk.workspaces.getList()` (errors → empty list).
6. Sets **active workspace** to `resolveWorkspace()` if provided, else `user.workspace` from `/api/me` — **not** `workspaces[0]`.

When `disableProxy !== true`, `/api/` is **prepended** to `skipPaths` automatically so proxied `/api/**` traffic is not double-handled by this `/api/me` probe.

> Rotated cookies may include `Secure`. Over plain HTTP, browsers may drop them — use HTTPS locally or configure Qelos for non-Secure cookies in dev.

## Use in controllers

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  QelosAuthGuard,
  QelosUser,
  QelosWorkspace,
  QelosCtx,
  type QelosRequestContext,
} from '@qelos/integrator-nest';
import type { IUser } from '@qelos/sdk/dist/authentication';
import type { IWorkspace } from '@qelos/sdk/workspaces';

@Controller()
export class AppController {
  @Get('me')
  me(
    @QelosUser() user: IUser | null,
    @QelosWorkspace() workspace: IWorkspace | null,
  ) {
    return { user, workspace };
  }

  @Get('private')
  @UseGuards(QelosAuthGuard)
  private(@QelosCtx() ctx: QelosRequestContext) {
    return ctx.user;
  }
}
```

`QelosRequestContext`:

| field        | description |
|--------------|-------------|
| `user`       | `IUser` from `/api/me`, or `null`. |
| `workspace`  | Active workspace or `null`. |
| `workspaces` | Workspaces from `getList()`. |
| `sdk`        | Request-scoped `QelosSDK` forwarding cookies live. |

## API token mode

For service-to-service traffic, set `apiToken` — the middleware skips the `/api/me` cookie flow for identity (you still get an SDK with the static token). Pair with `requireAuth` / `QelosGuard` as needed.

## Async configuration

```ts
QelosModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    config: {
      appUrl: config.getOrThrow('QELOS_APP_URL'),
      apiToken: config.get('QELOS_API_TOKEN'),
    },
  }),
});
```

## Configuration reference

```ts
QelosModule.forRoot({
  config: {
    appUrl: 'https://your-managed-app.com',

    apiToken: process.env.QELOS_API_TOKEN,

    requireAuth: false,

    skipPaths: ['/health', '/metrics'],

    disableProxy: false,

    sdkOptions: {},
  },

  resolveWorkspace: ({ request, user, workspaces }) => {
    const headerId = request.headers['x-qelos-workspace'];
    const raw = Array.isArray(headerId) ? headerId[0] : headerId;
    return workspaces.find((w) => w._id === raw) || user.workspace || null;
  },
});
```

## Requirements

- Node.js >= 18  
- NestJS 9, 10, or 11  
