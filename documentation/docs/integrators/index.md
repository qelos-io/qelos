---
title: Integrators
editLink: true
---

# Integrators

Qelos integrators are thin per-framework packages that plug your
application into a Qelos instance. They all expose the **same
contract** — a `QelosRequestContext` with `{ user, workspace,
workspaces, sdk }` — so once you've learned one, the others are
immediate.

If you haven't already, start with
[Getting Started as an Integrator](../getting-started/integrators.md) for
the overall flow (CLI, blueprints, deployment). The pages below are the
**per-framework setup guides**.

## Available integrators

| Framework | Package | Guide |
|---|---|---|
| **Express** | `@qelos/integrator-express` | [Express setup](./express.md) |
| **Next.js** (App + Pages Router) | `@qelos/integrator-next` | [Next.js setup](./next.md) |
| **Nuxt 3** | `@qelos/integrator-nuxt` | [Nuxt setup](./nuxt.md) |
| **Fastify** | `@qelos/integrator-fastify` | [Fastify setup](./fastify.md) |
| **NestJS** | `@qelos/integrator-nest` | [NestJS setup](./nest.md) |
| **FastAPI** (Python) | `qelos-integrator-fastapi` | [FastAPI setup](./fastapi.md) |

Every guide covers the same six steps:

1. **Install** the integrator and the SDK.
2. **Configure** the middleware / module.
3. **Access** the user and workspace from your routes.
4. **Handle** authentication — login, social auth, token refresh.
5. **Query** entities through the request-scoped SDK.
6. **Common patterns and gotchas.**

## What every integrator does

Independent of framework, all integrators run the same pipeline before
your handler:

1. Resolve the managed Qelos origin (proxy target): framework-specific env
   overrides, then `appUrl` / `app_url`.
2. Build a per-request `QelosSDK` that forwards the inbound `Cookie` and
   `Authorization` headers on every call (`extra_headers` / `extraHeaders`),
   unless `apiToken` / `api_token` is set.
3. When a proxy target exists, call `GET {origin}/api/me` with those headers
   and forward upstream `Set-Cookie` with `Domain=` rewritten to the inbound
   host (same-origin BFF).
4. Populate `user` from the `/api/me` JSON on success; load
   `workspaces` via `sdk.workspaces.getList()`.
5. Set `workspace` from `user.workspace` when present, or from an optional
   `resolveWorkspace` callback — **not** from `workspaces[0]`.
6. Attach the result on the framework-specific request object (`req.qelos`,
   `request.qelos`, `event.context.qelos`, `request.state.qelos`, or forwarded
   headers in Next.js edge middleware).

::: warning
The integrator packages are for **external apps only**. Apps inside the
Qelos monorepo MUST NOT depend on `@qelos/integrator-*` — they talk to
the gateway directly.
:::

## Shared configuration shape

```ts
{
  appUrl: string,                 // required — Qelos backend base URL
  apiToken?: string,              // service-to-service token (skips cookie forwarding)
  requireAuth?: boolean,          // 401 on anonymous (default false)
  skipPaths?: string[],           // path prefixes to bypass entirely
  disableProxy?: boolean,         // disable catch-all /api proxy where applicable
  sdkOptions?: Partial<QelosSDKOptions>,
}
```

The Python integrator uses snake_case for the same fields (`app_url`,
`api_token`, `require_auth`, `skip_paths`, `disable_proxy`, `sdk_options`).

## Picking the right one

- **Building a Node API or BFF?** Use the integrator that matches your
  framework directly — Express, Fastify, or NestJS for a clean fit; Next.js
  or Nuxt when the same app also serves your frontend.
- **Building a Python service?** Use FastAPI; the middleware is ASGI-level
  so it also works in any Starlette app.
- **Embedding inside a frontend?** For browser-only data calls, use
  [`@qelos/web-sdk`](../web-sdk/) instead of an integrator — the
  integrators are server-side only.
- **Integrating into a framework that's not listed?** Open an issue or
  port the contract — the Express implementation (`integrators/express/src`)
  is the simplest reference.
