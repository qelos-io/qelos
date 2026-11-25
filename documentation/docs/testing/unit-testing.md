---
title: Unit testing with the mock SDK
editLink: true
---

# Unit testing with the mock SDK

`@qelos/testing/sdk` gives you a real `QelosSDK` wired to an in-memory Qelos mock. Calls run in-process:
no HTTP server, no port, no network, no tenant.

```bash
npm i -D @qelos/testing @qelos/sdk
```

```ts
import { createMockSdk } from '@qelos/testing/sdk';

const { sdk, as, mock, reset } = createMockSdk({
  seed: {
    personas: [
      { email: 'admin@example.com', password: 'admin-pass', roles: ['admin'] },
      { email: 'user@example.com', password: 'user-pass', roles: ['user'] },
    ],
  },
});
```

## Acting as a user

- **Sign in like a real client.** `await sdk.authentication.oAuthSignin({ username, password })`, after which the SDK carries its own tokens.
- **Skip sign-in.** `createMockSdk({ persona: 'admin@example.com' })` makes `sdk` act as that persona from the first call.
- **Several users in one test.** `const admin = as('admin@example.com')` returns another SDK on the same mock.

## Inspecting and resetting state

- `mock.state` is the live in-memory state (`snapshot()`, `collection(name)`, `seed()`).
- `reset()` drops all data and reseeds from `seed`. Call it in `beforeEach`.
- `mock.on('GET', '/api/foo', () => ({ ok: true }))` overrides or adds a route for one test.

## Fixtures

`@qelos/testing/fixtures` builds seed data so tests state only what matters:

```ts
import { admin, member, blueprint, entities } from '@qelos/testing/fixtures';

const boss = admin();
const { as } = createMockSdk({
  seed: {
    personas: [boss, member('Acme')],
    blueprints: [blueprint('todo')],
    entities: { todo: entities(3, { title: 'todo {n}' }) },
  },
});
const todos = await as(boss.email).entities('todo').find();
```

`persona()`, `admin()`, `member(workspace)`, `workspace()` and `blueprint(identifier)` return defaults you can
override. `mergeSeeds(a, b)` combines seeds, and `resetFixtureSequence()` restarts the generated names.

## Reset between tests

`useMockSdk()` creates one mock per test file and resets it before every test:

```ts
import { beforeEach, it } from 'vitest'; // omit with Jest or Vitest `globals: true`
import { useMockSdk } from '@qelos/testing/sdk';

const t = useMockSdk({ seed }, { beforeEach });
it('creates a todo', async () => {
  await t.as(boss.email).entities('todo').create({ title: 'x' });
});
```

## Fault injection

`mock.faults` makes the mock misbehave, so you can test retries, error UIs and session expiry:

```ts
const { sdk, mock } = createMockSdk({ seed });

mock.faults.fail('GET /api/blueprints/*', 503, { times: 2 });   // first 2 calls fail, then recover
mock.faults.slow('/api/me', 2000);                             // answer after 2s
mock.faults.drop('POST /api/signin');                          // fetch rejects like a dropped connection
mock.faults.rateLimit('/api/**', { limit: 10, windowMs: 60_000 }); // 429 + retry-after after 10 calls
mock.faults.expireAccessTokens();                              // access tokens rejected; refresh still works
mock.faults.expireAllSessions();                               // forces a full sign-in
mock.faults.clear();
```

- A pattern is `'METHOD /path'` or just `'/path'` (any method). `:param`, a trailing `*` (one segment) and a
  trailing `**` (any depth) are supported.
- Rules accept `times`, `after` (let the first N through), `probability`, `headers` and `body`.
- Each rule returns a handle with `matched`, `applied` and `remove()`.
- Faults live in the process that created the mock. They don't apply to a separate `qelos-testing serve`
  process. `reset()` (and so `useMockSdk`) removes them before each test.
- The SDK does not refresh on its own after a server-side expiry. Call `sdk.authentication.refreshToken()` in the test.

## Scripted AI agents

`mock.ai` controls what AI agent chat returns, so tests don't depend on a real model:

```ts
mock.ai.reply(/refund/i, 'I have started your refund');         // regexp, string (substring) or (call) => boolean
mock.ai.reply('*', ['first answer', 'second answer']);          // a sequence: the last item repeats
mock.ai.reply('weather', { toolCalls: [{ name: 'get_weather', arguments: { city: 'Paris' } }] });
mock.ai.reply('story', { chunks: ['Once ', 'upon ', 'a time'] }); // streamed as separate chunks
mock.ai.reply('slow', { content: 'ok', delay: 1500 });
mock.ai.fail('boom', 503, 'model overloaded');                   // HTTP error

await sdk.ai.agents.chat('agent1', 'I want a refund');
expect(mock.ai.calls[0]).toMatchObject({ agentId: 'agent1', message: 'I want a refund' });
```

- Newest rules win, then seeded `aiResponses`, then an echo (`Mock response: <message>`).
- Options: `{ agent: 'agent1' }` restricts a rule to one agent, `{ times: 1 }` limits how often it applies.
- `mock.ai.calls` records every call (`agentId`, `messages`, `message`, `stream`, `threadId`).
- `reset()` clears rules and recorded calls.
- Only the mock's text and tool-call shapes are simulated. The mock does not run tools for you.

## Notes

- `@qelos/sdk` is an optional peer dependency, needed only for this entry point.
- The startup banner is silenced by default. Pass `logger` to see it.
- Use the [HTTP server](/testing/local-development) instead when the code under test is not the SDK
  itself, for example a frontend running in a browser.
