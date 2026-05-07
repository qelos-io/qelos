# @qelos/integrator-nest

NestJS module that calls the Qelos SDK to identify the current user and their
active workspace before your route handler runs, exposing them on
`request.qelos.user` / `request.qelos.workspace`.

This is the NestJS implementation of the Qelos integrator contract — the same
shape exposed by `@qelos/integrator-express`, `@qelos/integrator-fastify`,
`@qelos/integrator-nuxt`, `@qelos/plugin-netlify-api`, etc. It works with
both Nest's Express adapter and its Fastify adapter.

## Install

```sh
npm install @qelos/integrator-nest @qelos/sdk
# Nest is a peer dependency
npm install @nestjs/common @nestjs/core
```

## Quick start

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { QelosModule } from '@qelos/integrator-nest';

@Module({
  imports: [
    QelosModule.forRoot({
      config: {
        appUrl: process.env.QELOS_APP_URL!, // e.g. https://yourdomain.com
      },
    }),
  ],
})
export class AppModule {}
```

`forRoot` registers `QelosMiddleware` on every route by default. To restrict
its scope, import the module without `forRoot` and apply the middleware
yourself in `configure`:

```ts
import {
  QelosMiddleware,
  QelosModule,
  type QelosModuleOptions,
} from '@qelos/integrator-nest';
import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';

const options: QelosModuleOptions = {
  config: { appUrl: process.env.QELOS_APP_URL! },
};

@Module({
  imports: [QelosModule.forRoot(options)],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(QelosMiddleware).forRoutes('api/*');
  }
}
```

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
  // user/workspace are null when the request is anonymous
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

## What the middleware does

1. Reads the access token from `Authorization: Bearer ...` or the
   `q_access_token` cookie, and the refresh token from `q_refresh_token`.
2. Builds a per-request Qelos SDK instance bound to those tokens.
3. Calls `sdk.authentication.getLoggedInUser()` and
   `sdk.workspaces.getList()`.
4. Picks the active workspace (first by default — override with
   `resolveWorkspace`).
5. Attaches everything to `request.qelos`.

The middleware never throws for anonymous requests by default — it just
leaves `request.qelos.user` and `request.qelos.workspace` as `null`. Pass
`requireAuth: true` to short-circuit anonymous requests with `401`, or use
the per-route `QelosAuthGuard` for finer-grained control.

## Token refresh

When the access token is rejected, the SDK tries to recover, in order:

1. The **refresh token** (`q_refresh_token`) via
   `sdk.authentication.refreshToken()` — issues a new access + refresh pair.
2. The **cookie token** (the access token cookie itself) via
   `sdk.authentication.refreshCookieToken()` — used for cookie-only sessions
   that do not carry a separate refresh token (e.g. social-auth flows).

After a successful refresh the middleware fires the `onTokenRefresh` hook.
The default implementation writes the new tokens back to the response cookies
(`HttpOnly`, `SameSite=Lax`, `Secure` whenever `appUrl` is `https://...`).

You can supply your own — for example, to mint your own session cookie or
push the new tokens into a session store:

```ts
QelosModule.forRoot({
  config: { appUrl: process.env.QELOS_APP_URL! },
  onTokenRefresh: async ({ request, response, newTokens }) => {
    await sessionStore.rotate(request.session.id, newTokens);
  },
});
```

The hook receives `{ request, response, oldTokens, newTokens, sdk }`. The
`request` and `response` types are intentionally generic since Nest can run
on either Express or Fastify.

### Manual cookie refresh

Long-lived integrator-hosted sessions can also call the SDK directly to
proactively refresh the cookie token:

```ts
@Get('refresh-session')
async refresh(@QelosCtx() ctx: QelosRequestContext) {
  const result = await ctx.sdk.authentication.refreshCookieToken();
  // result.headers['set-cookie'] — fresh cookie value to forward
  return { user: result.payload.user };
}
```

## Async configuration

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

## Configuration

```ts
QelosModule.forRoot({
  config: {
    appUrl: 'https://yourdomain.com', // required

    // Service-to-service: use a static API token instead of cookies/refresh.
    apiToken: process.env.QELOS_API_TOKEN,

    // Cookie names. Defaults shown.
    accessTokenCookie: 'q_access_token',
    refreshTokenCookie: 'q_refresh_token',

    // Reject anonymous requests with 401. Defaults to false.
    requireAuth: false,

    // Skip the middleware entirely for these path prefixes.
    skipPaths: ['/health', '/metrics'],

    // Anything you want passed through to the per-request SDK.
    sdkOptions: {},
  },

  // Override workspace selection. Defaults to `workspaces[0]`.
  resolveWorkspace: ({ request, user, workspaces }) => {
    const headerId = request.headers['x-qelos-workspace'];
    return workspaces.find((w) => w._id === headerId) || workspaces[0] || null;
  },
});
```

## Requirements

- Node.js >= 18 (uses the global `fetch`).
- NestJS 9, 10, or 11.
