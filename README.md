# Qelos — AI-First Application Layer Gateway

[![Qelos CI/CD](https://github.com/qelos-io/qelos/actions/workflows/main.yml/badge.svg)](https://github.com/qelos-io/qelos/actions/workflows/main.yml)

<div align="center">
  <a href="https://qelos.io" target="_blank">
    <img src="https://qelos.io/qelos-hq.png" alt="Qelos Logo" width="200">
  </a>
  <p><strong>The backend layer your app plugs into — API gateway, AI agents, auth, workspaces, permissions, and events log out of the box.</strong></p>
</div>

## What is Qelos?

Qelos is an **AI-first application layer gateway**. It gives your application a
fully managed backend with a RESTful API, AI agent management, authentication,
multi-tenant workspaces, permissions, and an events log — all accessible via a
unified SDK and per-framework middleware.

| Role | What it means |
|---|---|
| **Admin panel** | Dashboard to manage data models, AI agents, users, workspaces, permissions, events |
| **API gateway** | RESTful endpoints backed by MongoDB; define your data model with blueprints, get CRUD + AI + auth instantly |
| **Framework plugin** | One middleware import (`@qelos/integrator-*`) makes Qelos *the* API for your Next.js, Nuxt, Express, Fastify, NestJS, or FastAPI app |

## Quick Start

### For integrators (use Qelos in your app)

```bash
# 1. Install the CLI
npm install -g @qelos/cli

# 2. Initialize in your project (detects framework, scaffolds config)
qelos init

# 3. Install the integrator for your framework
npm install @qelos/integrator-next   # or express, nuxt, fastify, nest

# 4. Use the SDK
npm install @qelos/sdk
```

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({ appUrl: 'https://your-qelos-instance.com', apiToken: 'your-api-token' });

// Query entities defined in your blueprints
const products = await sdk.entities('products').find({ status: 'active' });

// Chat with an AI agent
const response = await sdk.ai.agents.chat('agent-id', 'How can I help?');

// Check permissions
const allowed = await sdk.permissions.check('products:write');
```

### For contributors (run Qelos locally)

**Prerequisites:** [Node.js v20+](https://nodejs.org/) · [pnpm](https://pnpm.io/) · [Docker](https://www.docker.com/)

```bash
git clone https://github.com/qelos-io/qelos.git
cd qelos
pnpm install      # install dependencies
pnpm build        # build packages
pnpm dev          # start in development mode
```

> First time? Run `pnpm populate-db` in a second terminal to seed initial data, then log in with `test@test.com` / `admin`.

## Key Capabilities

- **RESTful API with DB** — define data models via blueprints, get full CRUD automatically
- **AI Agents** — create and manage chatbots, configure tools/functions, embed via SDK or widget
- **Authentication & Authorization** — social login, token management, session handling
- **Multi-Tenant Workspaces** — isolated environments with member management
- **Permissions & Roles** — resource-level access control enforced at the gateway
- **Events / Audit Log** — track all platform activity, forward to webhooks
- **CLI** — `@qelos/cli` for project scaffolding, agent management, IDE rules generation
- **Per-Framework Middleware** — Express, Next.js, Nuxt, Fastify, NestJS, FastAPI

## Project Structure

```
apps/                    Microservices & frontend
  gateway/               API gateway — entry point for all requests
  admin/                 Admin dashboard (Vue 3)
  ai/                    AI service — agents, chat completion, provider integration
  auth/                  Authentication & authorization service
  content/               Content management
  no-code/               Blueprint builder (no-code)
  plugins/               Plugin management
  secrets/               Secrets vault
  drafts/                Draft management
  db/                    MongoDB config (dev)
  redis/                 Redis config

packages/                Shared libraries (consumed internally + published)
  sdk/                   @qelos/sdk — TypeScript SDK
  python-sdk/            qelos-sdk — Python SDK
  api-kit/               Backend service utilities (Express, Axios, Morgan)
  global-types/          Shared TypeScript types
  cache-manager/         Cache management
  web-sdk/               Browser SDK & embeddable widgets
  plugin-play/           Plugin runtime
  plugin-netlify-api/    Netlify build plugin

integrators/             Framework middleware (published for external apps ONLY)
  express/               @qelos/integrator-express
  next/                  @qelos/integrator-next
  nuxt/                  @qelos/integrator-nuxt
  fastify/               @qelos/integrator-fastify
  nest/                  @qelos/integrator-nest
  fastapi/               @qelos/integrator-fastapi (Python)

tools/
  cli/                   @qelos/cli — the Qelos developer CLI

documentation/           Docs site (VitePress)
compose/                 Docker Compose configs
helm/                    Kubernetes Helm charts
```

## SDKs

### JavaScript / TypeScript

```bash
npm install @qelos/sdk
```

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({ appUrl: 'https://your-instance.com', apiToken: 'token' });

// Entities
const users = await sdk.entities('users').find({ role: 'admin' });

// AI agents
const reply = await sdk.ai.agents.chat('agent-id', 'Hello');

// Auth
const me = await sdk.authentication.getLoggedInUser();
```

See [packages/sdk/README.md](packages/sdk/README.md) for full documentation.

### Python

```bash
pip install qelos-sdk
```

```python
import asyncio
from qelos_sdk import QelosSDK, QelosSDKOptions

async def main():
    sdk = QelosSDK(QelosSDKOptions(
        app_url="https://your-instance.com",
        api_token="your-api-token",
    ))
    user = await sdk.authentication.get_logged_in_user()
    print(user)
    await sdk.close()

asyncio.run(main())
```

See [packages/python-sdk/README.md](packages/python-sdk/README.md) for full documentation.

## The Qelos CLI

```bash
npm install -g @qelos/cli

qelos init                    # Scaffold integrator config for your framework
qelos auth login              # Authenticate with your Qelos instance
qelos agents list             # List AI agents
qelos generate rules windsurf # Generate IDE rules for AI coding assistants
qelos pull / push             # Sync resources (blueprints, plugins, blocks)
```

## Deployment

### Docker Compose

```bash
cd compose
cp .env.example .env
docker-compose up
```

### Kubernetes (Helm)

```bash
node --env-file .env tools/ingest-helm-values/index.js
helm upgrade --install qelos -f ./helm/qelos/values-env.yaml ./helm/qelos
kubectl port-forward svc/gateway-service 3000:80
```

Access the admin at http://localhost:3000

### Default Login

| Field | Value |
|---|---|
| Username | `test@test.com` |
| Password | `admin` |

## Documentation

- [docs.qelos.io](https://docs.qelos.io) — full documentation
- [Installation Guide](https://docs.qelos.io/getting-started/installation.html)
- [Create Blueprints](https://docs.qelos.io/getting-started/create-blueprints.html)
- [Integrator Guide](https://docs.qelos.io/getting-started/integrators.html)
- [AI Agents](https://docs.qelos.io/ai/agents.html)
- [CLI Reference](https://docs.qelos.io/cli/)
- [Deployment Guide](https://docs.qelos.io/getting-started/deployment.html)

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full direction — AI agents, integrator
middleware, CLI enhancements, permissions, events log, and more.

## Resources

- [Official Website](https://qelos.io)
- [Documentation](https://docs.qelos.io)
- [GitHub Repository](https://github.com/qelos-io/qelos)
- [LinkedIn](https://www.linkedin.com/company/qelos/about/)
