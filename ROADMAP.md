# Qelos Roadmap

This document describes the upcoming direction for Qelos. It is intentionally
living: items will move, ship, or change shape as we learn. The goal of writing
it down here is to make the direction clear to contributors and integrators of
the open-source project.

## Vision: Qelos as an Application Layer

Qelos is evolving into **the application layer for apps**. Instead of being a
stand-alone admin product, the Qelos admin dashboard becomes the place where
developers manage their *application itself* — the data model (blueprints),
the workspace primitives, authentication, integrations, and the operational
surface that sits between their frontend/backend code and end users.

In practical terms this means:

- The **admin dashboard** is reframed around the app it powers (blueprints,
  data, workspaces, integrations) rather than around Qelos-as-a-product.
- The **SDK** becomes the primary surface developers consume from their own
  Next, Nuxt, Express, Fastify, Nest, FastAPI, etc. applications.
- New **integrator packages** make it trivial to drop Qelos identity and
  workspace context into any application stack as middleware.
- API defaults move toward what application developers actually want by
  default (e.g. flat entity responses), with opt-outs for advanced cases.

## Workstreams

The roadmap is split into independent workstreams. Each workstream maps to one
or more tasks tracked in our task system tagged with `qelos`. Tasks are
designed to be standalone so they can ship in any order.

### 1. API defaults that match application use

- **Blueprint entities default to `$flat: true`.** Today consumers must opt in
  to flattened responses; going forward this becomes the default because it is
  what application code wants 95% of the time. Callers can opt out by passing
  `$flat: false` or `$flat: 0` for the cases where the wrapped form is needed.

### 2. One unified admin navigation

- Today the admin dashboard ships **two sidebars** — one for administrators
  and one for regular users. We will merge them into a single sidebar that
  works for both audiences, picking the better of the two as the base and
  folding in the missing pieces from the other.
- The privileged home component should no longer lead with admin design /
  branding surfaces. Admin design is no longer a top priority; the home view
  should put the *application* first.

### 3. SDK surface for auth flows

- **Social auth callbacks** must be first-class in the SDK: the endpoints and
  operations that today live only in the auth service should be exposed
  through the SDK so application developers can wire them up directly.
- **Cookie token refresh** must be available as a single SDK operation, with
  the corresponding endpoint exposed by the auth service. This is what makes
  long-lived sessions in integrator-hosted apps practical.

### 4. Integrator middleware libraries

This is the largest piece of the roadmap. We want developers to be able to
add Qelos to any application stack with a single middleware import that:

1. Identifies the user from the incoming request (cookies / headers).
2. Resolves the active workspace.
3. Attaches both to the request context before the application's own handler
   runs.

Initial top-priority targets:

- **Next.js**
- **Nuxt**
- **Netlify** (a plugin already exists; it will be aligned to the same
  contract as the others — see the [Netlify plugin README][netlify-readme])
- **Express**

Follow-on targets:

- **Fastify**
- **NestJS**
- **FastAPI** (Python)
- Additional stacks as community demand appears.

#### Where these libraries live

Unlike the packages under `packages/`, integrator libraries are **not consumed
by any app inside this monorepo** — they exist purely for external
integrators. They will live either under `packages/` (with a clear naming
convention) or under a new top-level directory such as `integrators/`,
managed by the same pnpm workspace. Whichever location we pick, the GitHub CI
workflows and release scripts will be updated to publish them alongside the
existing packages.

[netlify-readme]: ./packages/plugin-netlify-api/README.md

## How to follow along

- Each item above is tracked as an individual task tagged `qelos` in the
  project's task board. New tasks reference this file so contributors can
  always find the bigger picture behind a specific change.
- Because Qelos is open source, contributions on any of these workstreams are
  welcome. If you want to pick up a task, comment on the corresponding ticket
  or open a draft PR referencing this roadmap.
- This document will be updated as workstreams complete or change. Treat the
  git history of this file as the canonical timeline of direction changes.
