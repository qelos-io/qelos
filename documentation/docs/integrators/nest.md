---
title: NestJS Integrator
editLink: true
---

# `@qelos/integrator-nest`

NestJS module that resolves the current Qelos user, active workspace, and
a per-request SDK client *before* your route handler runs, and exposes
them on `request.qelos`. Works with both Nest's Express adapter and its
Fastify adapter.

This is the NestJS implementation of the Qelos integrator contract — the
same shape exposed by `@qelos/integrator-express`,
`@qelos/integrator-fastify`, `@qelos/integrator-next`,
`@qelos/integrator-nuxt`, and the FastAPI integrator.

If you are new to Qelos, read
[Getting Started as an Integrator](../getting-started/integrators.md) first
for the overall flow (CLI, blueprints, deployment).

## 1. Install

```bash
npm install @qelos/integrator-nest @qelos/sdk
# Nest is a peer dependency
npm install @nestjs/common @nestjs/core
```

Requirements:

- **Node.js ≥ 18** (the integrator uses the global `fetch`).
- **NestJS 9, 10, or 11.**

## 2. Configure the module

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { QelosModule } from '@qelos/integrator-nest';

@Module({
  imports: [
    QelosModule.forRoot({
      config: {
        appUrl: process.env.QELOS_APP_URL!, // e.g. https://your-qelos-instance.com
      },
    }),
  ],
})
export class AppModule {}
```

`QelosModule.forRoot()` registers `QelosMiddleware` for **all** routes
(`forRoutes('*')`) inside the integrator module. To avoid running the
resolver on health checks, static paths, or webhooks, prefer
`config.skipPaths` (prefix match).

To mount the middleware only on a subset of routes (for example
`/api/*`), **do not** call `QelosModule.forRoot()` — it would still wire
the middleware globally. Instead, register `QelosMiddleware` yourself and
provide `QELOS_MODULE_OPTIONS`:

```ts
import {
  QelosMiddleware,
  QELOS_MODULE_OPTIONS,
  type QelosModuleOptions,
} from '@qelos/integrator-nest';
import { MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';

const qelosOptions: QelosModuleOptions = {
  config: { appUrl: process.env.QELOS_APP_URL! },
};

@Module({
  providers: [
    { provide: QELOS_MODULE_OPTIONS, useValue: qelosOptions },
    QelosMiddleware,
  ],
})
export class QelosIntegrationModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(QelosMiddleware).forRoutes({
      path: 'api',
      method: RequestMethod.ALL,
    });
  }
}
```

Import `QelosIntegrationModule` into `AppModule` instead of
`QelosModule.forRoot()` when using this pattern.

### Async configuration

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';

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

### All configuration options

```ts
QelosModule.forRoot({
  config: {
    appUrl: 'https://your-qelos-instance.com', // required

    apiToken: process.env.QELOS_API_TOKEN,

    requireAuth: false,

    skipPaths: ['/health', '/metrics'],

    disableProxy: false,

    sdkOptions: {},
  },

  resolveWorkspace: ({ request, user, workspaces }) => {
    const headerId = request.headers['x-qelos-workspace'];
    return (
      workspaces.find((w) => w._id === headerId) ||
      user.workspace ||
      null
    );
  },
});
```

The `request` and `response` types are intentionally generic so the same
hook works on both Express and Fastify adapters.

## 3. Access user and workspace in your routes

Three parameter decorators are exported. All three read what
`QelosMiddleware` attached to the request:

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

  // Short-circuit with 401 when there is no authenticated user.
  @Get('private')
  @UseGuards(QelosAuthGuard)
  private(@QelosCtx() ctx: QelosRequestContext) {
    return ctx.user;
  }
}
```

`QelosCtx` returns the full `QelosRequestContext`:

```ts
interface QelosRequestContext {
  user: IUser | null;          // null for anonymous requests
  workspace: IWorkspace | null;
  workspaces: IWorkspace[];
  sdk: QelosSDK;               // forwards Cookie / Authorization per call
}
```

`QelosAuthGuard` throws `UnauthorizedException` when no user is attached;
use it per-route instead of `config.requireAuth: true` when you want
finer-grained control.

## 4. Handle authentication

The integrator only **resolves** identity from existing tokens; it does
not host the login UI.

### Cookie-based session (recommended for browsers)

Most flows let users sign in directly against the Qelos backend (admin
panel, hosted login page, or a frontend that calls
`sdk.authentication.signin`). Qelos sets `q_access_token` and
`q_refresh_token` cookies on the user's browser; the middleware reads them
on subsequent requests.

You can also drive the login from a Nest controller:

```ts
import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import QelosSDK from '@qelos/sdk';

@Controller('auth')
export class AuthController {
  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Res({ passthrough: true }) res: any,
  ) {
    const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
    const { payload, headers } = await sdk.authentication.signin(body);
    if (headers['set-cookie']) res.setHeader('set-cookie', headers['set-cookie']);
    return { user: payload.user };
  }
}
```

### Social login

```ts
@Get('auth/google')
google(@Res() res: any) {
  const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
  return res.redirect(
    sdk.authentication.getSocialLoginUrl('google', {
      returnUrl: 'https://your-app.com/dashboard',
    }),
  );
}

@Get('auth/callback')
async callback(@Req() req: any, @Res() res: any) {
  const sdk = new QelosSDK({ appUrl: process.env.QELOS_APP_URL! });
  const { headers } = await sdk.authentication.exchangeAuthCallback(req.query.rt);
  if (headers['set-cookie']) res.setHeader('set-cookie', headers['set-cookie']);
  return res.redirect('/');
}
```

### Cookies and SDK calls

Rotations from Qelos arrive as `Set-Cookie` on the `/api/me` probe and on SDK
responses. The request-scoped SDK forwards cookies on each call.

See [Cookie Token Lifecycle](../auth/cookie-tokens.md).

### Service-to-service (no end user)

Set `config.apiToken` to skip cookies and refresh entirely:

```ts
QelosModule.forRoot({
  config: {
    appUrl: process.env.QELOS_APP_URL!,
    apiToken: process.env.QELOS_API_TOKEN!,
  },
});
```

## 5. Query entities

The SDK on `request.qelos.sdk` (or via `@QelosCtx()`) is already
authenticated as the current user, so blueprint permissions are enforced
for free:

```ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { QelosAuthGuard, QelosCtx, type QelosRequestContext } from '@qelos/integrator-nest';

@Controller('products')
@UseGuards(QelosAuthGuard)
export class ProductsController {
  @Get()
  list(@QelosCtx() { sdk }: QelosRequestContext) {
    return sdk.entities('products').getList({ status: 'active' });
  }

  @Post()
  create(@QelosCtx() { sdk }: QelosRequestContext, @Body() body: any) {
    return sdk.entities('products').create(body);
  }
}
```

The full surface — `getList`, `create`, `update`, `remove`, etc. — is in
the [Blueprints Operations reference](../sdk/blueprints_operations.md).

## 6. Common patterns and gotchas

- **The integrator package is for external apps only.** Apps inside the
  Qelos monorepo MUST NOT depend on `@qelos/integrator-*` — they talk to
  the gateway directly.
- **`QelosModule.forRoot()` registers the middleware globally.** Narrow
  exposure with `skipPaths`, or register `QelosMiddleware` and
  `QELOS_MODULE_OPTIONS` yourself (see above) — never combine that with
  `forRoot()` or the middleware runs twice.
- **`@QelosCtx()` returns `undefined` outside the middleware's scope.**
  Always combine it with `@UseGuards(QelosAuthGuard)` or
  `config.requireAuth: true` when you need a guaranteed user.
- **Anonymous requests don't throw by default.** `request.qelos.user`
  and `request.qelos.workspace` will simply be `null`. Use
  `config.requireAuth: true` (or `QelosAuthGuard` per-route) for a hard
  `401`.
- **Adapter-agnostic.** The same module works on
  `NestExpressApplication` and `NestFastifyApplication`.
- **Active workspace comes from `/api/me`’s `user.workspace`, not
  `workspaces[0]`.** Supply `resolveWorkspace` when you need another rule.
- **`Secure` cookies:** the middleware does not strip `Secure` from rotated
  cookies — configure Qelos / TLS for local dev if browsers drop cookies.
- **Don't reuse the per-request SDK across requests.** Build a fresh SDK with
  `apiToken` for cron jobs or workers.
