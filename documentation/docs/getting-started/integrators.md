---
title: Getting Started as an Integrator
editLink: true
---

# Getting Started as an Integrator

This guide walks you through plugging an existing application into Qelos —
installing the CLI, wiring up the integrator middleware for your framework,
calling the SDK from your code, modeling your data with a blueprint, and
shipping the result to production.

If you are running Qelos itself locally to contribute to the platform, see
the [Installation Guide](./installation.md) instead.

## What is Qelos?

Qelos is an **AI-first application layer gateway**. It gives your application
a fully managed backend — a RESTful API, AI agents, authentication,
multi-tenant workspaces, permissions, and an events log — exposed through a
unified SDK and per-framework middleware. You define your data model with
**blueprints** in the admin panel, and CRUD endpoints, permission
enforcement, and audit logging are generated for you.

You stay in your own framework. Qelos plugs in as middleware: the
`@qelos/integrator-*` package for your stack reads the request, attaches the
authenticated user, workspace, and a ready-to-use SDK client to every
request, and lets your handlers focus on application logic. Your app talks
to one Qelos instance — the same instance that hosts your admin panel — so
data, auth, and AI all stay in sync.

## Prerequisites

Before you start, make sure you have:

- **Node.js v20+** (for JavaScript / TypeScript apps) or **Python 3.9+**
  (for FastAPI apps).
- **A Qelos instance URL.** Either a managed Qelos instance, your own
  deployment, or a local install (see the [Installation Guide](./installation.md)).
  This is the value you will pass as `appUrl`.
- **An API token.** Create one in the admin panel under
  *Settings → API Tokens*. The token is required for service-to-service
  calls (CI, background jobs, server-side SDK clients without an end-user
  session).
- **Admin credentials** for that instance — you'll need them to sign in to
  the admin panel and create your first blueprint.

Set these as environment variables in your project. The integrator
middleware and CLI both read them by convention:

```bash [.env]
QELOS_APP_URL=https://your-qelos-instance.com
QELOS_API_TOKEN=ql_your_api_token_here
```

## 1. Install the CLI and connect your project

Install the Qelos CLI globally:

```bash
npm install -g @qelos/plugins-cli
```

After installation, both `qelos` and `qplay` commands are available:

```bash
$ qelos --version
0.6.2
```

Point the CLI at your instance. The CLI reads `QELOS_URL` and either
`QELOS_API_TOKEN` or `QELOS_USERNAME` / `QELOS_PASSWORD`:

```bash [.env]
QELOS_URL=https://your-qelos-instance.com
QELOS_API_TOKEN=ql_your_api_token_here
```

Generate IDE rules so AI coding assistants (Cursor, Windsurf, Copilot,
Claude Code) understand your Qelos instance, the SDK surface, and your
blueprints:

```bash
qelos generate rules all
```

The CLI also drives the resource workflow you'll use later — `qelos pull`
to fetch blueprints, blocks, plugins, and configurations into your repo,
and `qelos push` to send local changes back. See the
[CLI reference](../cli/index.md) for the full command list.

## 2. Configure the integrator middleware

Qelos ships a thin middleware package for every major framework. Each one
attaches a `qelos` context to the incoming request containing the resolved
user, workspace, and an authenticated SDK client. Pick your framework:

::: code-group

```ts [Express]
// app.ts
import express from 'express';
import { createQelosMiddleware, requireUser } from '@qelos/integrator-express';

const app = express();

app.use(
  createQelosMiddleware({
    config: {
      appUrl: process.env.QELOS_APP_URL!,
    },
  }),
);

app.get('/me', (req, res) => {
  res.json({
    user: req.qelos!.user,
    workspace: req.qelos!.workspace,
  });
});

app.get(
  '/private',
  requireUser((req, res) => {
    res.json(req.qelos!.user);
  }),
);
```

```ts [Next.js]
// middleware.ts
import { createQelosMiddleware } from '@qelos/integrator-next/middleware';

export default createQelosMiddleware({
  config: {
    appUrl: process.env.QELOS_APP_URL!,
    skipPaths: ['/_next', '/favicon.ico'],
  },
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

```ts [Nuxt]
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@qelos/integrator-nuxt'],
  qelos: {
    appUrl: process.env.QELOS_APP_URL!,
    requireAuth: false,
    skipPaths: ['/api/_auth', '/health'],
  },
});
```

```ts [Fastify]
// server.ts
import Fastify from 'fastify';
import qelosFastify, { requireUser } from '@qelos/integrator-fastify';

const app = Fastify();

await app.register(qelosFastify, {
  config: {
    appUrl: process.env.QELOS_APP_URL!,
  },
});

app.get('/me', async (request) => ({
  user: request.qelos!.user,
  workspace: request.qelos!.workspace,
}));

app.get(
  '/private',
  { preHandler: requireUser },
  async (request) => request.qelos!.user,
);
```

```ts [NestJS]
// app.module.ts
import { Module } from '@nestjs/common';
import { QelosModule } from '@qelos/integrator-nest';

@Module({
  imports: [
    QelosModule.forRoot({
      config: {
        appUrl: process.env.QELOS_APP_URL!,
      },
    }),
  ],
})
export class AppModule {}
```

```python [FastAPI]
# main.py
from typing import Annotated, Optional

from fastapi import Depends, FastAPI
from qelos_integrator_fastapi import (
    QelosConfig,
    QelosIntegratorMiddleware,
    QelosRequestContext,
    get_qelos,
    require_user,
)

app = FastAPI()
app.add_middleware(
    QelosIntegratorMiddleware,
    config=QelosConfig(app_url="https://your-qelos-instance.com"),
)


@app.get("/me")
async def me(qelos: Annotated[Optional[QelosRequestContext], Depends(get_qelos)]):
    return {
        "user": qelos.user if qelos else None,
        "workspace": qelos.workspace if qelos else None,
    }


@app.get("/private")
async def private(qelos: Annotated[QelosRequestContext, Depends(require_user)]):
    return qelos.user
```

:::

Install the matching package alongside the SDK:

::: code-group

```bash [Express]
npm install @qelos/integrator-express @qelos/sdk
```

```bash [Next.js]
npm install @qelos/integrator-next @qelos/sdk
```

```bash [Nuxt]
npm install @qelos/integrator-nuxt
```

```bash [Fastify]
npm install @qelos/integrator-fastify @qelos/sdk
```

```bash [NestJS]
npm install @qelos/integrator-nest @qelos/sdk
```

```bash [FastAPI]
pip install qelos-integrator-fastapi qelos-sdk
```

:::

Every integrator accepts the same `config` shape — `appUrl`, an optional
`apiToken` for service-to-service calls, `requireAuth` to reject
unauthenticated requests globally, and `skipPaths` to bypass routes like
`/health`. After the middleware runs, the request carries:

| Field | What it is |
|---|---|
| `user` | The authenticated user, or `null` for anonymous requests |
| `workspace` | The active workspace for the request |
| `workspaces` | All workspaces the user is a member of |
| `sdk` | A `QelosSDK` instance scoped to the user's session |
| `tokens` | The access / refresh token pair |

> The integrator packages are for external apps **only**. Apps inside this
> monorepo MUST NOT depend on `@qelos/integrator-*` — they talk to the
> gateway directly.

## 3. Use the SDK

The SDK is your primary surface for talking to Qelos from code. Inside a
request handler, use `req.qelos.sdk` (which already knows about the current
user). For background jobs, scripts, or anywhere outside a request, build a
client from your API token:

```ts
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: process.env.QELOS_APP_URL!,
  apiToken: process.env.QELOS_API_TOKEN!,
});
```

### Your first entity query

Once you have a blueprint named `products` (we'll create one in the next
step), every CRUD operation is one method call:

```ts
const products = await sdk.entities('products').find({ status: 'active' });

const created = await sdk.entities('products').create({
  name: 'Acme Widget',
  status: 'active',
  price: 19.99,
});
```

### Your first auth check

To get the user behind the current session:

```ts
const me = await sdk.authentication.getLoggedInUser();
```

Inside an integrator-wrapped handler you typically don't need to call this
directly — `req.qelos.user` (or `event.context.qelos.user` in Nuxt,
`request.state.qelos.user` in FastAPI) is already populated. Use the
explicit call for non-request contexts or when you need to refresh.

The full SDK reference, including the `entities`, `authentication`,
`workspaces`, `permissions`, and `ai` namespaces, lives under the
[SDK section](../sdk/sdk.md).

## 4. Create your first blueprint

A **blueprint** is the schema definition that turns into a REST resource.
Create one in the admin panel:

1. Sign in to your Qelos instance and open **Blueprints** from the main
   menu.
2. Click **Create New Blueprint** and give it an identifier like
   `products`. The identifier is what you pass to `sdk.entities(...)`.
3. Add properties — for example a `name` (String, required), a `status`
   (String), and a `price` (Number).
4. Set the permissions scope so the right users can read and write the
   resource.
5. (Optional) Add OnSave mappings, relations to other blueprints, or
   webhooks fired on Create / Update / Delete.
6. Save.

Your new endpoints are live immediately. The SDK call from the previous
section now works without any further configuration — Qelos generated the
route, the storage, the validation, and the permission check from the
blueprint. See [Create Blueprints](./create-blueprints.md) for a deeper
walkthrough.

## 5. Add AI chat to your app

Once you've configured an AI agent in the admin panel (see
[Configure Your First AI Agent](../tutorials/configure-first-ai-agent.md)),
talking to it from your app is a single SDK call:

```ts
const reply = await sdk.ai.agents.chat('agent-id', 'How do I return an order?');
```

For long-running conversations, pass a thread id so the agent has memory
across turns. From the CLI, you can prototype the same agent locally
before wiring it into your app:

```bash
qelos agent <agent-id> -m "How do I return an order?" -s
```

If you want to embed an interactive chat widget directly into a frontend —
including in a separate domain — install `@qelos/web-sdk` and use the
`authorize()` flow described in
[Cross-Domain Authorization](../mfe/cross-domain-authorization.md).

## 6. Deploy

Your integrated app is just a regular Node.js or Python service —
deploy it however you already deploy your stack (Vercel, Fly, Render,
Kubernetes, a VM). The only requirements are:

- `QELOS_APP_URL` and (where applicable) `QELOS_API_TOKEN` must be set in
  the production environment.
- Your production domain must be allowed to call your Qelos instance —
  add it to the trusted origins list in the admin panel under
  *Settings → CORS*.
- If you're running Qelos itself in production for the first time, the
  [Deployment](../deployment/index.md) section covers Docker Compose,
  Kubernetes / Helm, and the production checklist.

A typical promotion sequence: develop against a staging Qelos instance,
run `qelos pull blueprints ./qelos` to commit your blueprints to git,
deploy your app, then `qelos push blueprints ./qelos` against the
production instance to apply the same data model there.

## Next steps

- [Configure Your First AI Agent](../tutorials/configure-first-ai-agent.md)
- [SDK Reference](../sdk/sdk.md)
- [CLI Reference](../cli/index.md)
- [API Reference](../api/api.md)
- [Plugins & Micro-Frontends](../plugins/create.md)
