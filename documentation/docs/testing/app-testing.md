---
title: Testing an app end to end
editLink: true
---

# Testing an app end to end

`@qelos/testing/http` serves your app on an ephemeral port and gives you a client that can act as any
mock persona. Your app uses its Qelos [integrator](/integrators/) in [mock mode](/testing/local-development),
so the whole stack runs without a tenant.

```ts
import express from 'express';
import { createQelosIntegrator } from '@qelos/integrator-express';
import { testApp } from '@qelos/testing/http';

const { middleware, proxy } = createQelosIntegrator({
  config: {
    appUrl: 'http://unreachable.invalid',
    mock: { seed: { personas: [{ email: 'admin@example.com', password: 'pw', roles: ['admin'] }] } },
  },
});
const app = express();
app.use(middleware);
app.use('/api', proxy!);

const client = await testApp(app);
const me = await client.as('admin@example.com').json('/api/me'); // { status, ok, body }
await client.close();
```

## Client API

- `client.as(persona)` returns a client that sends the mock persona header. No sign-in needed.
- `client.signIn(username, password)` signs in through `/api/signin` and keeps the session cookies.
- `client.json(path, { json })` sends and parses JSON. `client.fetch(path, init)` is a plain `fetch`.
- `client.close()` stops the server (only if `testApp` started it).

## Which apps work

`testApp()` takes a Node request listener (Express, Connect, plain `http`) or an `http.Server`. For
Fastify and NestJS pass `app.server` after `ready()` / `init()`.
