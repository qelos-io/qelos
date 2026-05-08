---
title: Intro to Qelos
editLink: true
---
# Intro to Qelos

![Qelos Logo](/qelos-hq.png)

## What is Qelos?

Qelos is an **AI-first application layer gateway**. It is the single backend layer that any application plugs into to get a fully managed REST API, AI agents, authentication, multi-tenant workspaces, permissions, and an events log — all accessible through a unified SDK and per-framework integrator middleware.

Your app stays in your own framework. You define your data model with **blueprints** in the admin panel, and the gateway generates CRUD endpoints, permission enforcement, and audit logging for you.

## The three roles Qelos plays

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
    <div style="background-color: #E8F5E9; padding: 20px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <img src="/manage_icon.svg" alt="Admin Panel" style="width: 50px; height: 50px;">
    </div>
    <p><strong>🛠️ Admin panel for applications</strong></p>
    <p>A dashboard where developers and operators manage their app's data model, AI agents, users, workspaces, permissions, and events.</p>
  </div>

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
    <div style="background-color: #E1F5FE; padding: 20px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <img src="/cloud_done_icon.svg" alt="API Gateway" style="width: 50px; height: 50px;">
    </div>
    <p><strong>🌐 API gateway for apps</strong></p>
    <p>A RESTful API backed by MongoDB that apps consume via the SDK. Blueprints define the data model; the gateway exposes CRUD, AI chat, auth, and more.</p>
  </div>

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
    <div style="background-color: #FFF3E0; padding: 20px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <img src="/extension_2icon.svg" alt="Framework Plugin" style="width: 50px; height: 50px;">
    </div>
    <p><strong>🧩 A plugin for every framework</strong></p>
    <p>Integrator middleware (<code>@qelos/integrator-*</code>) makes the Qelos API <em>the</em> API for your app with a single import.</p>
  </div>

</div>

## What Qelos brings to your app

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px;">

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
    <div style="background-color: #E8F5E9; padding: 20px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <img src="/code_icon.svg" alt="Blueprints" style="width: 50px; height: 50px;">
    </div>
    <p><strong>🧱 Blueprints → REST API</strong></p>
    <p>Define your data model in the admin panel; get full CRUD endpoints, validation, and permission checks generated automatically.</p>
  </div>

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
    <div style="background-color: #E1F5FE; padding: 20px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <img src="/rocket_icon.svg" alt="AI Agents" style="width: 50px; height: 50px;">
    </div>
    <p><strong>🤖 AI agents & chatbots</strong></p>
    <p>Create, configure, and embed AI agents. Switch providers (OpenAI, Anthropic, Gemini) without changing your product architecture.</p>
  </div>

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
    <div style="background-color: #FFF3E0; padding: 20px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <img src="/desktop_mac_icon.svg" alt="Auth & Workspaces" style="width: 50px; height: 50px;">
    </div>
    <p><strong>🔐 Auth, permissions & workspaces</strong></p>
    <p>Multi-tenant workspaces, social login, cookie/token lifecycle, roles, and resource-level permissions enforced at the gateway.</p>
  </div>

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
    <div style="background-color: #FBE9E7; padding: 20px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <img src="/tools_icon.svg" alt="SDK & CLI" style="width: 50px; height: 50px;">
    </div>
    <p><strong>🧰 Unified SDK + CLI</strong></p>
    <p>One TypeScript or Python SDK for every capability, plus <code>@qelos/cli</code> for scaffolding, agents, and IDE rules generation.</p>
  </div>

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
    <div style="background-color: #E8F5E9; padding: 20px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <img src="/extension_2icon.svg" alt="Integrator Middleware" style="width: 50px; height: 50px;">
    </div>
    <p><strong>🔌 Per-framework middleware</strong></p>
    <p>Drop-in integrators for Next.js, Nuxt, Express, Fastify, NestJS, and FastAPI — one import wires up auth, workspace, and SDK on every request.</p>
  </div>

  <div style="text-align: center; display: flex; flex-direction: column; align-items: center;">
    <div style="background-color: #E1F5FE; padding: 20px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <img src="/cloud_upload_icon.svg" alt="Events & Audit" style="width: 50px; height: 50px;">
    </div>
    <p><strong>📜 Events & audit log</strong></p>
    <p>Every API call, auth event, and AI interaction is recorded. Forward to webhooks or query through the SDK.</p>
  </div>

</div>

## How developers use Qelos

1. Install the CLI: `npm install -g @qelos/cli`
2. Initialize in their project: `qelos init` (detects framework, scaffolds config)
3. Install the integrator: `npm install @qelos/integrator-next` (or express, nuxt, fastify, nest, fastapi)
4. Use the SDK in their code: `sdk.entities('products').find()`, `sdk.ai.agents.chat()`, etc.
5. Manage everything from the admin panel or the CLI.

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: process.env.QELOS_APP_URL!,
  apiToken: process.env.QELOS_API_TOKEN!,
});

const products = await sdk.entities('products').find({ status: 'active' });
const reply = await sdk.ai.agents.chat('agent-id', 'How can I help?');
```

## How to get started

Pick the path that matches what you're trying to do:

1. **[Getting Started as an Integrator](./integrators.md)** — plug an existing app into a Qelos instance using the CLI, the integrator for your framework, and the SDK.
2. **[Installation](./installation.md)** — clone the repo and run Qelos itself locally (for contributors and self-hosting).
3. **[Create Blueprints](./create-blueprints.md)** — model your application's data and get CRUD endpoints automatically.
4. **[Configure Your First AI Agent](../tutorials/configure-first-ai-agent.md)** — wire up an agent end-to-end and call it from your app.
5. **[Deployment](./deployment.md)** — ship Qelos to production with Docker Compose or Kubernetes / Helm.

## HTTP API and the gateway

Every product app talks to Qelos through a single **gateway**: browser traffic and API calls hit one origin; paths such as `/api/me`, `/api/blueprints/.../entities`, `/api/ai/...`, and `/api/events` are proxied to internal services (auth, no-code, AI, plugins, and others). You do not call those microservices directly from client code.

For a concise map of those routes, request headers, example **`curl`** commands, and **`@qelos/sdk`** equivalents organized by domain, see the **[Gateway endpoint reference](/api/gateway-endpoint-reference)**. The full topic pages under [API Reference](/api/api) expand request and response shapes for each area.

## Additional resources

- [Official Website](https://qelos.io/)
- [Roadmap](https://github.com/qelos-io/qelos/blob/main/ROADMAP.md)
- [GitHub Repository](https://github.com/qelos-io/qelos)
- [Follow Us on LinkedIn](https://www.linkedin.com/company/qelos/about/)
