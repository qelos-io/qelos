---
layout: home
title: Qelos Documentation
editLink: true
hero:
  name: Qelos
  text: Build AI Agents & SaaS Applications
  tagline: Build intelligent agents, visual workflows, and multi-tenant SaaS apps—fast.
  image:
    src: /qelos-hq.png
    alt: Qelos
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/intro
    - theme: alt
      text: Start Free Trial
      link: https://app.qelos.io
    - theme: alt
      text: View on GitHub
      link: https://github.com/qelos-io/qelos
features:
  - icon: 🤖
    title: AI Agents & Workflows
    details: Deploy AI agents for support, data processing, and complex business workflows.
  - icon: 🎨
    title: Visual Builders
    details: Build with no-code editors, WYSIWYG UI, and visual workflows.
  - icon: 🔌
    title: Plugin System
    details: Extend your app with plugins, endpoints, and micro-frontends.
  - icon: 🚀
    title: Launch in Days
    details: Go from idea to a working SaaS with auth, billing, and workflows.
  - icon: 🌐
    title: Multi-Model AI
    details: Switch between providers (OpenAI, Anthropic, Gemini, etc.) without changing product architecture.
  - icon: 📈
    title: Scale with Confidence
    details: Built for multi-tenant growth, high throughput, and production reliability.
---

## Start here

Pick the path that matches what you're trying to do:

<div class="vp-doc" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 16px;">

<div class="custom-card">
  <h3>🏁 New to Qelos</h3>
  <p>Install, run locally, and understand the core concepts.</p>
  <a href="/getting-started/intro">Go to Getting Started →</a>
</div>

<div class="custom-card">
  <h3>🧩 Build a plugin</h3>
  <p>Create plugins, endpoints, CRUD, and micro-frontends.</p>
  <a href="/plugin-play/">Explore Plugin Play →</a>
</div>

<div class="custom-card">
  <h3>💳 Payments</h3>
  <p>Set up billing and payment flows.</p>
  <a href="/payments/">Open Payments docs →</a>
</div>

<div class="custom-card">
  <h3>🧰 Use the SDK</h3>
  <p>Integrate Qelos programmatically in your apps and services.</p>
  <a href="/sdk/sdk">Read the SDK reference →</a>
</div>

<div class="custom-card">
  <h3>🧰 CLI</h3>
  <p>Sync and manage resources between local and remote instances.</p>
  <a href="/cli/">Go to the CLI docs →</a>
</div>

<div class="custom-card">
  <h3>🎨 UI templates</h3>
  <p>Pre-designed frontends, components, and PubSub events.</p>
  <a href="/pre-designed-frontends/components/">Browse templates →</a>
</div>

</div>

## Quick start (local)

```bash
# Clone
git clone https://github.com/qelos-io/qelos.git

# Install deps
pnpm install

# Build packages
pnpm build

# Start dev environment (includes MongoDB)
pnpm dev

# Seed initial data (new terminal)
pnpm populate-db
```

## Popular guides

<div class="vp-doc" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 16px;">

<div class="custom-card">
  <h3>🏗️ Installation</h3>
  <p>Set up your development environment and install Qelos.</p>
  <a href="/getting-started/installation">Learn more →</a>
</div>

<div class="custom-card">
  <h3>🧭 Create blueprints</h3>
  <p>Design and implement your application's data models.</p>
  <a href="/getting-started/create-blueprints">Learn more →</a>
</div>

<div class="custom-card">
  <h3>🎨 Design system</h3>
  <p>Learn about the Qelos design system and UI components.</p>
  <a href="/getting-started/design-system">Learn more →</a>
</div>

<div class="custom-card">
  <h3>🔧 Patterns & speed</h3>
  <p>Tips and patterns to accelerate SaaS development with Qelos.</p>
  <a href="/getting-started/design-products-faster">Learn more →</a>
</div>

<div class="custom-card">
  <h3>🔌 Build plugins</h3>
  <p>Extend your application with custom plugins.</p>
  <a href="/getting-started/create-your-first-plugin">Learn more →</a>
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
