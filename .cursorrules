# Qelos — AI-First Application Layer Gateway

## What is Qelos

Qelos is an **AI-first application layer gateway**. It serves as:
1. An admin panel for applications (manage data models, AI agents, users, workspaces, permissions, events).
2. An API gateway for apps (RESTful endpoints backed by MongoDB; blueprints define the data model).
3. A plugin for every framework (`@qelos/integrator-*` middleware makes Qelos *the* API for any app).

It is multi-tenant. External developers integrate via the SDK (`@qelos/sdk`) and per-framework integrator middleware.

## Tech Stack

- **Backend**: Node.js, Express, MongoDB, Redis, Mongoose
- **Frontend**: Vue 3.5 (Composition API), Pinia, Element-Plus, Vue-i18n, Vue-Router, Vue-ECharts, Monaco-Editor, PrimeVue
- **SDKs**: TypeScript (`@qelos/sdk`), Python (`qelos-sdk`), Browser (`@qelos/web-sdk`)
- **CLI**: `@qelos/cli` (tools/cli) — the single developer CLI for scaffolding, auth, agents, rules generation

## Architecture

| Path | Role |
|---|---|
| `/apps/gateway` | API gateway — entry point for ALL requests |
| `/apps/admin` | Admin dashboard (Vue 3) — manage the application |
| `/apps/ai` | AI service — agents, chat completion, provider integration |
| `/apps/auth` | Authentication & authorization (users, workspaces, permissions) |
| `/apps/content` | Content service (drafts, configurations) |
| `/apps/secrets` | Secrets vault |
| `/apps/no-code` | Blueprint builder (no-code data model creation) |
| `/apps/plugins` | Plugin service — connect micro-SaaS platforms, integrations |
| `/apps/db` | MongoDB config for dev environment |
| `/packages/sdk` | `@qelos/sdk` — THE primary surface for external app developers |
| `/packages/python-sdk` | Python SDK |
| `/packages/web-sdk` | Browser SDK & embeddable AI chat widget |
| `/packages/api-kit` | Backend service utilities (Express, Axios, Morgan) |
| `/packages/global-types` | Shared TypeScript types |
| `/packages/cache-manager` | Cache management |
| `/packages/plugin-netlify-api` | Netlify build plugin |
| `/integrators/express` | `@qelos/integrator-express` — Express middleware |
| `/integrators/next` | `@qelos/integrator-next` — Next.js middleware |
| `/integrators/nuxt` | `@qelos/integrator-nuxt` — Nuxt middleware |
| `/integrators/fastify` | `@qelos/integrator-fastify` — Fastify plugin |
| `/integrators/nest` | `@qelos/integrator-nest` — NestJS module |
| `/integrators/fastapi` | `@qelos/integrator-fastapi` — FastAPI middleware (Python) |
| `/tools/cli` | `@qelos/cli` — developer CLI |

## Key Design Principles

- **Efficiency** is the most important aspect of the code.
- Prefer **TypeScript** when possible.
- Prefer **ES modules** instead of CommonJS.
- Never name folders "utils" — use services, models, store, compositions, etc.
- The SDK is the primary developer surface; every new API capability must be exposed through it.
- Integrator packages are for external apps ONLY — apps in this monorepo MUST NOT depend on them.

## Coding Conventions

- In Vue.js components: prefer Composition API; use `defineModel()` instead of `defineProps()` + `defineEmits()` for `update:modelValue`.
- CSS/styles: always prefer inset positions (`inline`, `block`) instead of `top`, `left`, `bottom`, `right`.
- LTR inputs (code lines, script lines, etc.): use `dir="ltr"` attribute.
- `/packages/api-kit` is the shared API kit for all backend services (Express.js, Axios, Morgan for logs).

## SDK API Surface (target)

```typescript
sdk.entities('blueprint-name').find() / .create() / .update() / .delete()
sdk.ai.agents.chat(agentId, message)
sdk.authentication.socialCallback() / .refreshCookieToken()
sdk.permissions.check() / .getUserPermissions()
sdk.events.list() / .emit() / .subscribe()
sdk.workspaces.create() / .inviteUser() / .listMembers()
```

## CLI Commands (target)

```
qelos init              — detect framework, scaffold config
qelos auth login|logout — developer authentication
qelos agents list|create|test — AI agent management
qelos generate rules <type> — IDE rules for AI assistants
qelos dev               — local development proxy
qelos pull|push|dump|restore — resource management
```
