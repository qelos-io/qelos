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

### Impersonation and tenant settings

- `adminSdk.impersonateUser(userId, workspaceId)` works as in production: the admin is seen as that user, so what the
  user may not do is refused. Managing users and workspaces stays open to them.
- Seed `auth-configuration` or `workspace-configuration` in `configurations` to test who may create API tokens or
  workspaces. Once an `auth-configuration` exists, API tokens are refused unless it allows them.

### Permissions

Whoever you act as, signed in or not, is held to the blueprint's `permissions` as in production: only admins can use
a blueprint that has none, so give your test blueprints the permissions the real ones have (`qelos pull blueprints`
includes them).

```ts
const todo = blueprint('todo', {
  permissions: ['create', 'read'].map((operation) => ({ operation, scope: 'user', roleBased: ['user'] })),
});
const { sdk } = createMockSdk({ seed: { personas, blueprints: [todo] } });

await sdk.authentication.oAuthSignin({ username: 'user@example.com', password: 'user-pass' });
const todos = sdk.blueprints.entitiesOf('todo');
const mine = await todos.create({ title: 'mine' }); // allowed
await expect(todos.update(mine.identifier, { title: 'changed' })).rejects.toThrow('not permitted');
```

- The other routes follow their services too:

  | | Read | Change |
  |---|---|---|
  | Blueprints | signed-in users (without `permissions` and other settings, unless admin or `plugin`) | `admin`, `plugin` |
  | Configurations | one: anyone if public, else `admin`. The list: `admin` | `admin` |
  | Blocks | one: anyone (content only, unless editor). The list: editors | `editor`, `plugin`, `admin` |
  | Scripts, components, agents, integrations, connections | `admin`, `plugin` | `admin`, `plugin` |
  | Drafts | signed-in users, their own | signed-in users, their own |
  | Plugins | the list: anyone (fewer settings unless `admin`). One: `admin`, `plugin` | `admin` |
  | Functions (`manageLambdas`) | `admin` | `admin` |
  | Agent chat and webhooks | signed-in users, within the roles the agent or `lambdas` entry asks for | |

  A refused call answers `401`, with these exceptions: a private configuration is `404`, listing agents is `500`, and a
  missing role for a chat or webhook is `403`.
- After `mock.faults.expireAccessTokens()` a signed-in user is a guest: data calls get only what guests may do.
- A call with no credentials, or with ones the mock never issued (a made-up API token), is not checked. Pass
  `strictPermissions: true` to treat such callers as guests, as production does.
- An admin who sends `bypassAdmin` is treated as a regular user on data calls. **The administrator SDK sends it by
  default**, so its `entities(...)` calls need a permission that names the `admin` role, here as in production. Pass
  `extraQueryParams: () => ({})` to the SDK to keep the admin bypass.
- `entitiesOf(...).remove()` returns the raw response and does not reject: check its `status`.

### Limitations

A blueprint's `limitations` work as in production: creating one entity more than allowed rejects with
`reached limit of allowed entities`, by `scope` (`tenant`, `workspace` or `user`), `roles`, `workspaceLabels` and
`properties`. Like permissions, they are not checked for a call with no credentials, unless `strictPermissions` is on.

### Calculated properties

A blueprint's `updateMapping` calculates properties with `jq` on every create and update. The mock does the same when
the optional `node-jq` package is installed, the library the service uses:

```bash
npm install --save-dev node-jq
```

Installing it downloads the `jq` program, so allow its install script if your package manager asks (pnpm does).
Without it, the mock warns once and leaves those properties as they were sent.

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

## Payments

`sdk.payments` and the administrator SDK's `managePayments` work against the mock: plans, coupons, subscriptions,
checkout, invoices and the payments configuration. There is no payment provider, so your test says what happened:

```ts
const { sdk, mock } = createMockSdk({
  seed: {
    personas,
    pricingPlans: [{ _id: 'pro', name: 'Pro', monthlyPrice: 30, yearlyPrice: 300 }],
    coupons: [{ code: 'HALF', discountType: 'percentage', discountValue: 50 }],
  },
  persona: 'user@example.com',
});

const { subscriptionId } = await sdk.payments.checkout({ planId: 'pro', billingCycle: 'monthly', couponCode: 'HALF' });
await sdk.payments.getMySubscription();         // null: still pending

mock.payments.pay(subscriptionId);              // the provider reports a successful payment
await sdk.payments.getMySubscription();         // active
await sdk.payments.getInvoices();               // one paid invoice, amount 15

mock.payments.fail(subscriptionId);             // past_due
mock.payments.cancel(subscriptionId);           // canceled
```

- `checkoutUrl` points at `checkout.qelos.mock`, which does not exist. Take the `subscriptionId` and call
  `mock.payments`. With a served mock (e2e tests), use `POST /__qelos_mock__/payments/<subscriptionId>/pay`
  (or `/fail`, `/cancel`).
- Without a `payments-configuration` every checkout is accepted. Seed one in `configurations`, or set it with
  `managePayments.updatePaymentsConfiguration`, to test a disabled or incomplete setup. Rules of a specific
  provider (such as catalog price ids) are not checked.
- Plans pulled with `qelos pull pricing-plans` are served as they are.
- A non-admin checks out for their own user or active workspace only; naming another account, or its subscription,
  answers `403`.
- As in the service today, a non-admin with an **active workspace** can list the workspace's subscriptions and
  invoices, but gets `403` on a single one (including its activity and cancelling it).

## Integrations, connections and plugins

The administrator SDK's `integrations`, `integrationSources`, `manageLambdas` and `managePlugins` work against the
mock, with the validation of the service and no outside calls:

```ts
const base = { labels: [], metadata: {}, authentication: {} };
const qelosSource = { ...base, name: 'qelos', kind: 'qelos' };
const openaiSource = { ...base, name: 'openai', kind: 'openai', authentication: { token: 'any-value' } };
const qelos = await admin.integrationSources.create(qelosSource);
const openai = await admin.integrationSources.create(openaiSource);

await admin.integrations.create({
  trigger: { source: qelos._id, operation: 'chatCompletion', details: { name: 'Helper' } },
  target: { source: openai._id, operation: 'chatCompletion', details: {} },
  active: true,
});
// `admin.ai.agents.list()` now has the "Helper" agent
```

- `admin` is an administrator SDK, created as in [Managing users](#managing-users).
- Secrets are never answered or stored. A status check answers `connected` when the settings and credentials it needs
  are there; use [fault injection](#fault-injection) to test a failing one.
- Functions need an `aws` or `cloudflare` connection. They are kept in `mock.state.collection('functions')`; nothing is
  deployed or run.
- `remove` on these APIs does not reject when refused: check the list.

## Scripts and drafts

The administrator SDK's `scripts` (and the older `components`) create, change and remove scripts and components, also
in bulk. Nothing is compiled: an invalid source is accepted, `requiredProps` stays empty and there is no
`compiledContent`.

Its `drafts` keep each signed-in user's own drafts, with `getList`, `setDraft`, `getDraft` and `remove`. In
`@qelos/sdk` 4.4.0 and earlier, `getList` rejects with `draft not found`, also against the real service.

## MCP sign-in

An app that signs users in over MCP can be tested end to end. The mock has no approval page: opening the authorize
address as a user sends them straight back to the app.

```ts
const redirectUri = 'http://localhost:8088/callback';
const url = sdk.authentication.getMcpAuthorizeUrl({ redirectUri, codeChallenge, codeChallengeMethod: 'S256' });
const response = await mock.fetch(`${url}&persona=user@example.com`);
const { code } = parseMcpCallbackParams(response.headers.get('location')!);

const { user } = await sdk.authentication.exchangeMcpAuthorizationCode({ code: code!, redirectUri, codeVerifier });
```

- `parseMcpCallbackParams` comes from `@qelos/sdk`; `codeChallenge` is made from `codeVerifier` by your app.
- In a browser test, the persona cookie picks the user; without a user the browser is sent to `/login`.
- A code works once, for its address and verifier.
- Seed an `mcp-configuration` (`{ key, metadata: { enabled, permittedCallbackUrls } }`) in `configurations` to test a
  disabled tenant or a refused address. Without one, MCP sign-in is on and accepts any address.

## Creating blueprints

Blueprints created or changed through the API are checked as by the service. Give each one an `identifier` and a
`name`, and each property a `title` and a `type`: properties without them are silently dropped. Seeded blueprints are
used as they are.

## Charts

`sdk.blueprints.getChart`, `getPieChart`, `getSum` and `getCount` are computed from the mock's entities, over what the
caller may read.

- Filter by property as when listing: `entities('order').count({ status: 'open' })`.
- Dates group by day of the week (1 is Sunday) and times by hour, both in UTC.

## AI document storage

`sdk.ai.rag` works for administrators without a model provider. Check what the app uploaded in
`mock.state.collection('vectorStores')`.

## Platform events

The administrator SDK's `events` work against the mock with the service's permissions: **administrators** read events,
administrators and users with the **`plugin`** role dispatch them, and everyone else gets `401`.

```ts
await admin.events.dispatch({ source: 'billing', kind: 'invoice', eventName: 'sent', description: 'Invoice sent' });
const { events, total } = await admin.events.getList({ kind: 'invoice' });
```

- `admin` is an administrator SDK, created as in [Managing users](#managing-users).
- `getList` returns one page: `{ events, total, page, limit, totalPages }`, although the SDK types it as an array.
  By default it covers the **last week**; pass `period: 'all-time'` to include older seeded events.
- `dispatch` never rejects, also when it is refused or the event is missing `source`, `kind` or `eventName` (which is
  then dropped). Check what arrived with `getList` or `mock.state.events`.
- Creating, updating and removing entities adds an event when the blueprint's `dispatchers` ask for it
  (`source: 'blueprints'`, `kind` is the blueprint, `eventName` is `create`, `update` or `delete`). On an update,
  `metadata.modifiedFields` lists every property of the entity, changed or not, as the service does.

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
