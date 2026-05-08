---
layout: home
title: Qelos Documentation
editLink: true
hero:
  name: Qelos
  text: AI-First Application Layer Gateway
  tagline: The backend layer your app plugs into — REST API, AI agents, auth, workspaces, permissions, and events log out of the box.
  image:
    src: /qelos-hq.png
    alt: Qelos
  actions:
    - theme: brand
      text: Get Started as an Integrator
      link: /getting-started/integrators
    - theme: alt
      text: Run Qelos Locally
      link: /getting-started/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/qelos-io/qelos
features:
  - icon: 🧱
    title: Blueprints → REST API
    details: Define your data model in the admin panel; get full CRUD endpoints, validation, and permission checks for free.
  - icon: 🤖
    title: AI Agents
    details: Create, configure, and embed AI agents. Switch providers (OpenAI, Anthropic, Gemini) without changing product architecture.
  - icon: 🔐
    title: Auth, Permissions & Workspaces
    details: Multi-tenant workspaces, social login, cookie/token lifecycle, roles, and resource-level permissions enforced at the gateway.
  - icon: 🧰
    title: Unified SDK
    details: One TypeScript or Python SDK for entities, AI, auth, permissions, events, and workspaces.
  - icon: 🔌
    title: Per-Framework Middleware
    details: Drop-in integrators for Next.js, Nuxt, Express, Fastify, NestJS, and FastAPI — one import and you're wired in.
  - icon: 📜
    title: Events & Audit Log
    details: Every API call, auth event, and AI interaction is recorded. Forward to webhooks or query via the SDK.
---

## What is Qelos?

Qelos is the **AI-first application layer gateway**. It plays three roles for your app:

<div class="vp-doc" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 16px;">

<div class="custom-card">
  <h3>🛠️ Admin panel</h3>
  <p>Manage data models, AI agents, users, workspaces, permissions, and events from a single dashboard.</p>
</div>

<div class="custom-card">
  <h3>🌐 API gateway</h3>
  <p>RESTful endpoints backed by MongoDB. Blueprints define the data model; CRUD, AI chat, and auth come for free.</p>
</div>

<div class="custom-card">
  <h3>🧩 Plugin for every framework</h3>
  <p><code>@qelos/integrator-*</code> middleware makes Qelos <em>the</em> API for your Next.js, Nuxt, Express, Fastify, NestJS, or FastAPI app.</p>
</div>

</div>

## Pick your path

<div class="vp-doc" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 16px;">

<div class="custom-card">
  <h3>🚀 Integrate Qelos into your app</h3>
  <p>Install the CLI, drop in the integrator for your framework, and start calling the SDK.</p>
  <a href="/getting-started/integrators">Getting Started as an Integrator →</a>
</div>

<div class="custom-card">
  <h3>🏁 Run Qelos locally</h3>
  <p>Clone the repo, start the dev environment, and explore the admin panel.</p>
  <a href="/getting-started/installation">Installation guide →</a>
</div>

<div class="custom-card">
  <h3>🧰 Use the SDK</h3>
  <p>Entities, AI agents, auth, permissions, workspaces, and events — one client surface.</p>
  <a href="/sdk/sdk">Read the SDK reference →</a>
</div>

<div class="custom-card">
  <h3>⌨️ Use the CLI</h3>
  <p><code>qelos init</code>, <code>qelos generate rules</code>, <code>qelos dev</code>, <code>qelos pull/push</code> — your day-to-day developer tool.</p>
  <a href="/cli/">Go to the CLI docs →</a>
</div>

<div class="custom-card">
  <h3>🤖 Build with AI agents</h3>
  <p>Create agents in the admin panel, then embed them in your app via the SDK or web widget.</p>
  <a href="/ai/agents">Open the AI agents guide →</a>
</div>

<div class="custom-card">
  <h3>🔌 Browse integrators</h3>
  <p>Per-framework setup guides for Express, Next.js, Nuxt, Fastify, NestJS, and FastAPI.</p>
  <a href="/integrators/">See available integrators →</a>
</div>

</div>

## Quick start

### Integrate Qelos in an existing app

```bash
# 1. Install the CLI
npm install -g @qelos/cli

# 2. Initialize in your project (detects framework, scaffolds config)
qelos init

# 3. Install the integrator for your framework
npm install @qelos/integrator-next   # or express, nuxt, fastify, nest

# 4. Install the SDK
npm install @qelos/sdk
```

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-instance.com',
  apiToken: 'ql_your_api_token_here',
});

// Query entities defined in your blueprints
const products = await sdk.entities('products').find({ status: 'active' });

// Chat with an AI agent
const reply = await sdk.ai.agents.chat('agent-id', 'How can I help?');

// Check permissions
const allowed = await sdk.permissions.check('products:write');
```

### Run Qelos locally

```bash
git clone https://github.com/qelos-io/qelos.git
cd qelos
pnpm install      # install dependencies
pnpm build        # build packages
pnpm dev          # start the dev environment (includes MongoDB)
pnpm populate-db  # seed initial data (in a new terminal)
```

Log in at `http://localhost:3000/` with `test@test.com` / `admin`.

## Popular guides

<div class="vp-doc" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 16px;">

<div class="custom-card">
  <h3>🧭 Create blueprints</h3>
  <p>Design data models that turn into REST resources automatically.</p>
  <a href="/getting-started/create-blueprints">Learn more →</a>
</div>

<div class="custom-card">
  <h3>🤖 Configure your first AI agent</h3>
  <p>Wire up an agent end-to-end and chat with it from your app.</p>
  <a href="/tutorials/configure-first-ai-agent">Open the tutorial →</a>
</div>

<div class="custom-card">
  <h3>🔐 Auth & permissions</h3>
  <p>Email/password, social login, cookie tokens, roles, and resource-level access.</p>
  <a href="/auth/">Browse auth docs →</a>
</div>

<div class="custom-card">
  <h3>📡 Gateway endpoint reference</h3>
  <p>Every gateway route mapped to its SDK call and a curl example.</p>
  <a href="/api/gateway-endpoint-reference">Open the reference →</a>
</div>

<div class="custom-card">
  <h3>🧩 Build a plugin</h3>
  <p>Plugins, custom endpoints, and micro-frontends for your Qelos instance.</p>
  <a href="/plugins/create">Create a plugin →</a>
</div>

<div class="custom-card">
  <h3>🚢 Deploy</h3>
  <p>Docker Compose, Kubernetes / Helm, and the production checklist.</p>
  <a href="/deployment/">Deployment guide →</a>
</div>

</div>

<style>
.custom-card {
  padding: 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.custom-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.custom-card h3 {
  margin: 0 0 6px 0;
  font-size: 16px;
}

.custom-card p {
  margin: 0 0 10px 0;
  color: var(--vp-c-text-2);
}

.custom-card a {
  color: var(--vp-c-brand);
  text-decoration: none;
  font-weight: 600;
}

.custom-card a:hover {
  text-decoration: underline;
}
</style>
