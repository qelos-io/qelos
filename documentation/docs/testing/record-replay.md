---
title: Record and replay
editLink: true
---

# Record and replay

Use a cassette for endpoints the mock does not implement itself. For state (users, blueprints, entities,
configurations) prefer [`qelos pull`](/cli/pull) / [`qelos dump`](/cli/dump): the mock then runs its own logic, including
writes, on top of that data. A cassette only replays what was recorded.

## Record

Wrap the real `fetch` the SDK uses. Every `/api/**` exchange is redacted and appended to
`qelos-fixtures/cassette.jsonl`:

```ts
import QelosSDK from '@qelos/sdk';
import { createRecorder } from '@qelos/testing/cassette';

const recorder = createRecorder({ out: './qelos-fixtures' });
const sdk = new QelosSDK({ appUrl: 'https://my-tenant.example.com', fetch: recorder.fetch, apiToken });

await sdk.payments.getPlans(); // recorded
```

### Record with the proxy

To record an app you run as is (a frontend, or a server in any language), put the proxy between it and the
tenant instead of editing code:

```bash
npx @qelos/testing record --target https://my-tenant.example.com --port 4000 --out ./qelos-fixtures
```

Point the app's Qelos URL at `http://127.0.0.1:4000` and use it normally. Responses come back unchanged,
and every `/api/**` exchange is redacted and appended to `qelos-fixtures/cassette.jsonl`.

- Credentials are forwarded to the tenant as sent. The proxy binds to loopback by default, so keep it there.
- Flags: `--port`, `--host`, `--out`, `--include /api/,/other/` (path prefixes), `--append` (keep an existing
  cassette) and `--allow-unredacted`.
- Redirects are passed through, not followed.
- `Domain` and `Secure` are removed from `Set-Cookie` so the session cookie works on the local proxy origin.
- Response bodies are buffered, so a streamed response (SSE, AI streams) is recorded as one text body.
- If the secret scan refuses an exchange, the app gets a `502` and the proxy logs why.

## Replay

```ts
import { createMockQelos } from '@qelos/testing';

const mock = createMockQelos({ cassette: './qelos-fixtures' });
```

Routes the mock implements are answered by the mock. Only requests nothing else handles are answered from
the cassette. Matching uses method, path, sorted query and the (redacted) body, never the host. Repeated
identical requests return the recorded responses in order, and the last one repeats.

A miss returns `404` with `code: 'QELOS_MOCK_CASSETTE_MISS'` and the closest recorded requests. If you also
pass `onMissing`, it runs for cassette misses.

## What gets redacted

- Request and response headers are not stored, except the response content type.
- JSON keys that look like secrets (`password`, `token`, `refreshToken`, `apiKey`, anything containing
  `secret`, ...) become `[REDACTED]`, in bodies and query strings.
- Emails and names are kept as they are.
- A final scan refuses to record an exchange that still contains a JWT, a bearer token, a long hex string or
  a private key. The recorder throws, naming the pattern. Fix it with the `redact(exchange)` hook (it can
  edit the exchange or return `null` to drop it), or pass `allowUnredacted: true` if you have checked it.
- Recording is refused when `NODE_ENV=production` unless you pass `allowInProduction`.

Review `cassette.jsonl` before you commit it. The scanner catches known token shapes, not every secret.

## Options

`createRecorder({ out, fetch, redact, allowUnredacted, allowInProduction, append, include })`. `include` is a
list of path prefixes to record and defaults to `['/api/']`.
