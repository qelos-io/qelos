# Qelos Roadmap

This document describes the upcoming direction for Qelos. It is intentionally
living: items will move, ship, or change shape as we learn. The goal of writing
it down here is to make the direction clear to contributors and integrators of
the open-source project.

## Vision: Qelos as an AI-First Application Layer Gateway

Qelos is evolving into **the AI-first application layer gateway**. It is the
single backend layer that any application plugs into to get a fully managed
API, AI agents, authentication, workspaces, permissions, and an events log —
all accessible through a unified SDK and per-framework integrator middleware.

Qelos serves three roles:

1. **Admin panel for applications** — a dashboard where developers and
   operators manage their app's data model, AI agents, users, workspaces,
   permissions, and events.
2. **API gateway for apps** — a RESTful API backed by MongoDB that apps
   consume via the SDK. Blueprints define the data model; the gateway exposes
   CRUD, AI chat, auth, and more.
3. **A plugin for every framework** — integrator middleware packages
   (`@qelos/integrator-*`) that make the Qelos API *the* API for your app
   with a single import.

### What Qelos brings to your app

| Capability | Status |
|---|---|
| RESTful API with DB, easily configured via blueprints | Shipping |
| AI agents management & chatbot creation | Shipping |
| Authentication & authorization workflows | Shipping |
| Multi-tenant workspaces | Shipping |
| Permissions & roles | In progress |
| Events / audit log | In progress |
| CLI (`@qelos/cli`) with skills & rules for AI coding assistants | In progress |
| Per-framework integrator middleware | In progress |

### How developers use Qelos

1. Install the CLI: `npm install -g @qelos/cli`
2. Initialize in their project: `qelos init` (detects framework, scaffolds config)
3. Install the integrator: `npm install @qelos/integrator-next` (or express, nuxt, etc.)
4. Use the SDK in their code: `sdk.entities('products').find()`, `sdk.ai.agents.chat()`, etc.
5. Manage everything from the admin panel or the CLI.

---

## Workstreams

The roadmap is split into independent workstreams. Each workstream maps to one
or more tasks tracked in our task system tagged with `qelos`. Tasks are
designed to be standalone so they can ship in any order.

### 1. API gateway surface

- **Blueprint entities default to `$flat: true`.** Today consumers must opt in
  to flattened responses; going forward this becomes the default because it is
  what application code wants 95% of the time. Callers can opt out by passing
  `$flat: false` or `$flat: 0`.
- **API versioning** — support `Accept-Version` header and optional `/api/v1/`
  prefix so breaking changes can coexist.
- **Rate limiting & usage tracking** — configurable per tenant/api-key, feeding
  into the events log and admin monitoring dashboard.
- **Webhook / event forwarding** — allow external apps to register URLs that
  receive platform events (entity changes, auth events, AI completions).

### 2. AI agents & chatbots

- Expose **agent management REST API**: CRUD agents, configure tools/functions,
  manage system prompts.
- Provide **direct agent chat endpoint** so external apps can embed chatbots
  via `sdk.ai.agents.chat(agentId, message)`.
- Ship an **embeddable chat widget** via `@qelos/web-sdk` — a single script
  tag that connects to a Qelos-managed agent.
- Add **CLI commands** for agent management: `qelos agents list`, `create`, `test`.

### 3. The Qelos CLI

The CLI (`tools/cli`) is published as `@qelos/cli`. It becomes the single
developer tool for working with Qelos:

- `qelos init` — detect framework, scaffold config, install integrator
- `qelos auth login|logout|token|status` — developer authentication
- `qelos agents list|create|test` — AI agent management
- `qelos generate rules <type>` — emit IDE rules (Windsurf, Cursor, Claude)
  describing the Qelos API surface so AI assistants can build with Qelos
- `qelos dev` — local development proxy (like Netlify CLI)
- `qelos pull|push|dump|restore` — resource management (already exists)

### 4. SDK as primary developer surface

The SDK (`@qelos/sdk`) becomes the main way apps interact with Qelos:

- **Entity query builder**: `sdk.entities('products').find({ status: 'active' })`
- **AI agents**: `sdk.ai.agents.chat(agentId, message)`
- **Auth**: `sdk.authentication.socialCallback()`, `sdk.authentication.refreshCookieToken()`
- **Permissions**: `sdk.permissions.check()`, `sdk.permissions.getUserPermissions()`
- **Events**: `sdk.events.list()`, `sdk.events.emit()`, `sdk.events.subscribe()`
- **Workspaces**: `sdk.workspaces.create()`, `sdk.workspaces.inviteUser()`
- **Real-time**: `sdk.subscribe()` for entity changes and AI streaming

### 5. Integrator middleware libraries

A single middleware import that:

1. Identifies the user from the incoming request (cookies / headers).
2. Resolves the active workspace.
3. Attaches both to the request context before the application's own handler
   runs.

Priority targets (exist under `integrators/`):

| Package | Framework | Status |
|---|---|---|
| `@qelos/integrator-express` | Express | In progress |
| `@qelos/integrator-next` | Next.js | In progress |
| `@qelos/integrator-nuxt` | Nuxt | In progress |
| `@qelos/integrator-fastify` | Fastify | Scaffolded |
| `@qelos/integrator-nest` | NestJS | Scaffolded |
| `@qelos/integrator-fastapi` | FastAPI (Python) | Scaffolded |
| `@qelos/plugin-netlify-api` | Netlify | Shipping (aligning to shared contract) |

#### Where these libraries live

Integrator libraries live under `integrators/` and are managed by the same
pnpm workspace. They are **not consumed by apps in this monorepo** — they
exist purely for external integrators. CI workflows publish them to npm
alongside existing packages.

### 6. One unified admin navigation

- Merge the two sidebars (admin + user) into a single sidebar that works for
  both audiences.
- Reframe the home view as application-first — show entity data, recent
  activity, agent interactions rather than admin design/branding.
- Add **API gateway monitoring** dashboard (usage, errors, AI token consumption).
- Add **events/audit log** viewer with filtering and search.
- Add **API key management** UI for connected integrator apps.

### 7. Auth, permissions & workspaces

- Expose **social auth callback endpoints** for the SDK.
- Expose **cookie token refresh** as a single SDK/API operation.
- Add **permissions CRUD endpoints**: roles, scopes, resource-level access.
- Enhance **workspace management** endpoints: create, invite, list members, set permissions.

### 8. Events / audit log

- Create a platform events service storing all events: API calls, auth events,
  AI interactions, permission changes.
- Expose via REST API for the SDK `events` module.
- Support webhook delivery to registered external URLs.

### 9. Documentation

- **Getting Started as an Integrator** — top-level guide covering CLI init,
  integrator packages, SDK usage, deployment.
- **SDK reference** with entity query builder, AI agents, permissions, events examples.
- **API gateway endpoint reference** organized by domain.
- **Per-framework integrator guides** (Next.js, Nuxt, Express, Fastify, NestJS, FastAPI).
- **AI agents guide** — creation, configuration, embedding in external apps.
- **Auth & permissions guide** — full lifecycle documentation.

---

## How to follow along

- Each item above is tracked as an individual task tagged `qelos` in the
  project's task board (`aidev.tasks.json`). New tasks reference this file so
  contributors can always find the bigger picture behind a specific change.
- Because Qelos is open source, contributions on any of these workstreams are
  welcome. If you want to pick up a task, comment on the corresponding ticket
  or open a draft PR referencing this roadmap.
- This document will be updated as workstreams complete or change. Treat the
  git history of this file as the canonical timeline of direction changes.

[netlify-readme]: ./packages/plugin-netlify-api/README.md
