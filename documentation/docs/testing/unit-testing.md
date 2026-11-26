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
// AI calls need a signed-in user, as in production: act as a persona (or sign in first)
const { sdk, mock } = createMockSdk({ seed, persona: 'user@example.com' });

mock.ai.reply(/refund/i, 'I have started your refund');         // regexp, string (substring) or (call) => boolean
mock.ai.reply('*', ['first answer', 'second answer']);          // a sequence: the last item repeats
mock.ai.reply('weather', {                                      // the agent uses a tool, then answers
  toolCalls: [{ name: 'get_weather', arguments: { city: 'Paris' }, result: { temp: 21 } }],
  followup: 'It is 21°C in Paris',
});
mock.ai.reply('story', { chunks: ['Once ', 'upon ', 'a time'] }); // streamed as separate chunks
mock.ai.reply('slow', { content: 'ok', delay: 1500 });
mock.ai.fail('boom', 500, 'model overloaded');                   // the model provider fails

await sdk.ai.agents.chat('agent1', 'I want a refund');
expect(mock.ai.calls[0]).toMatchObject({ agentId: 'agent1', message: 'I want a refund' });
```

- Newest rules win, then seeded `aiResponses`, then an echo (`Mock response: <message>`).
- Streamed calls (`?stream=true` or `accept: text/event-stream`) send the same server-sent events as the Qelos
  AI service: `{ type: 'chunk', content }` ... `{ type: 'done' }`.
- A failure (`mock.ai.fail` or `error`) is an `{ type: 'error', message }` event inside a `200` stream, as in the
  real service. Non-streamed calls answer with the status you give. The real service answers `500` when the model
  provider fails, so script other statuses only for what happens before the model is called.
- Options: `{ agent: 'agent1' }` restricts a rule to one agent, `{ times: 1 }` limits how often it applies.
- `mock.ai.calls` records every call (`agentId`, `messages`, `message`, `stream`, `threadId`).
- `reset()` clears rules and recorded calls.
- The mock does not run tools. For tools the service runs, you script what they returned (`result`).

### Tool calls

What a reply with `toolCalls` gives the app depends on who runs the tool, as in the real service:

| | Tools the service runs | Tools in the request's `clientTools` |
|---|---|---|
| Non-streamed | the final answer (`followup`) in `choices`, plus `function_calls` and `function_results` | `{ type: 'client_tool_calls', functionCalls, backendResults, assistantToolCalls }` |
| Streamed | tool events, `continuing_conversation`, then `followup` as `followup_chunk` events | a `client_tool_calls` event with the same fields |

A completion never hands tool calls back in `choices[0].message.tool_calls`. When the app runs its client tools and
sends their results back (messages with `role: 'tool'` and the matching `tool_call_id`), the same rule answers with
`followup`:

```ts
mock.ai.reply('open', { toolCalls: [{ name: 'openModal' }], followup: 'Opened' });

const clientTools = [{ name: 'openModal', description: 'Opens a modal' }];
const messages: any[] = [{ role: 'user', content: 'open it' }];
const first: any = await sdk.ai.chat.chat('agent1', { messages, clientTools });
// run first.functionCalls in the app, then send the results back
messages.push({ role: 'assistant', content: '', tool_calls: first.assistantToolCalls });
messages.push({ role: 'tool', tool_call_id: first.functionCalls[0].id, content: 'done' });
const second: any = await sdk.ai.chat.chat('agent1', { messages, clientTools });
// second.choices[0].message.content === 'Opened'
```

## Chat threads

`sdk.ai.createThread`, `getThread`, `listThreads` and `deleteThread` work against the mock, and conversations are
recorded the way the service records them.

```ts
const agentId = 'a'.repeat(24);
const { as, mock } = createMockSdk({
  seed: {
    personas,
    agents: [{ _id: agentId, trigger: { details: { recordThread: true } } }],
  },
});
const user = as('user@example.com'); // personas as in the first example

const thread = await user.ai.createThread({ integration: agentId });
await user.ai.chat.chatInThread(agentId, thread._id, { messages: [{ role: 'user', content: 'Hi' }] });
const stored = await user.ai.getThread(thread._id); // the question and the answer
```

- An agent with `trigger.details.recordThread` requires a thread the caller owns. Other agents ignore the thread.
- `sdk.ai.agents.chat` keeps each conversation in a thread, creating one when you don't pass a `threadId`.
- Users see their own threads (in their active workspace). Admins see all of them, unless they send `bypassAdmin`.
- Without seeded `agents`, any agent id is accepted. Once you seed some, creating a thread or using `agents.chat`
  with an unknown or inactive agent fails with `404`.
- The thread title is the start of the first user message. The real service writes one with the model.
- Seed `threads` to start a test with existing history.
- `limit` on `listThreads` is not applied, as in the service today.

## Managing users

The administrator SDK's user methods (`sdk.users`) work for personas and seeded users with the `admin` role:

```ts
import QelosAdministratorSDK from '@qelos/sdk/administrator';
import { PERSONA_HEADER } from '@qelos/testing';

const admin = new QelosAdministratorSDK({
  appUrl: 'http://qelos.mock',
  fetch: mock.fetch,
  extraHeaders: async () => ({ [PERSONA_HEADER]: 'admin@example.com' }),
});

const created = await admin.users.create({ username: 'new@example.com', password: 'a-password', firstName: 'New', lastName: 'User' });
// the new user can sign in
await sdk.authentication.oAuthSignin({ username: 'new@example.com', password: 'a-password' });
```

- Anyone else gets `401`, as from the real service.
- Lists and single users carry the fields the service returns: there is no `email` in them.
- Tenant settings come from the `auth-configuration` document in `configurations`: `treatUsernameAs` (default
  `email`) and `additionalUserFields`.
- Removing a user also removes the persona with the same id, so it can no longer act or sign in.

## Runtime requirement

`@qelos/testing` ships both ES modules and CommonJS, so it works with:

- **Jest** in its default (CommonJS) mode, with no transform or experimental flags. This includes the Express,
  Fastify and NestJS integrators in mock mode.
- **Vitest**, **`tsx`**, bundlers and plain `node` / `node --test`.

`@qelos/testing/sdk` also needs a `@qelos/sdk` release after 4.4.0. Version 4.4.0 and earlier ship ES module
syntax with extensionless imports, which plain `node` and Jest cannot load: use Vitest, `tsx` or a bundler with
those versions.

## Notes

- `@qelos/sdk` is an optional peer dependency, needed only for this entry point.
- The startup banner is silenced by default. Pass `logger` to see it.
- Use the [HTTP server](/testing/local-development) instead when the code under test is not the SDK
  itself, for example a frontend running in a browser.
