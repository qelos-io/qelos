---
title: Testing with Qelos
editLink: true
---

# Testing with Qelos

[`@qelos/testing`](https://github.com/qelos-io/qelos/tree/main/packages/testing) is the testing
suite for apps that use the Qelos SDK or a Qelos integrator. Its core is a stateful, in-memory mimic of
the Qelos HTTP API (sign up / sign in, sessions, workspaces, blueprint entities, ...), so your app, your
tests and your CI can run **without a Qelos tenant, a network or an account**.

```bash
npm i -D @qelos/testing
```

## What you can do with it

| Goal | Use | Guide |
|---|---|---|
| Unit-test code that uses the SDK | `createMockSdk()` from `@qelos/testing/sdk` | [Unit testing](/testing/unit-testing) |
| Test your HTTP app (Express, Fastify, Nest, ...) end to end | `testApp()` from `@qelos/testing/http` | [Testing an app](/testing/app-testing) |
| Build seed data with factories | `persona()`, `admin()`, `blueprint()`, `entities()` from `@qelos/testing/fixtures` | [Fixtures](/testing/unit-testing#fixtures) |
| Test retries, error handling and expiry | `mock.faults` (latency, 5xx, dropped connections, rate limits, expired sessions) | [Fault injection](/testing/unit-testing#fault-injection) |
| Script AI agent replies and tool calls | `mock.ai` | [Scripted AI agents](/testing/unit-testing#scripted-ai-agents) |
| Test checkout, subscriptions and invoices | `sdk.payments` on the mock, `mock.payments` | [Payments](/testing/unit-testing#payments) |
| Replay recorded tenant responses for endpoints the mock lacks | `createRecorder()` and `createMockQelos({ cassette })` | [Record and replay](/testing/record-replay) |
| Develop locally with no tenant | Mock mode in your integrator, or `qelos mock serve` | [Develop locally without a tenant](/testing/local-development) |
| Seed realistic data | Import `qelos dump` / `qelos pull` folders into mock state | [`qelos mock`](/cli/mock) |
| Run integration / e2e tests against a real HTTP server | `createMockQelos()` + the `qelos-testing` bin | [Package README](https://github.com/qelos-io/qelos/tree/main/packages/testing) |
| Test your integrator setup | Enable mock mode in Express, Next.js, Nuxt, Fastify, NestJS or FastAPI | [Integrators](/integrators/) |

## Safety

Mock mode refuses to run in production (`NODE_ENV=production`, non-debug FastAPI runs, ...) unless you
opt in explicitly. Install `@qelos/testing` as a **dev dependency** only.
