---
layout: home
title: Qelos Documentation
editLink: true
hero:
  name: Qelos
  text: Build AI Agents & SaaS Applications
  tagline: The ultimate AI-powered platform for creating intelligent agents, agent-to-agent communications, and multi-tenant SaaS applications using graphic builders, AI tooling, and visual workflows
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
features:
  - icon: 🤖
    title: AI Agents & Workflows
    details: Deploy intelligent AI agents that handle customer support, data processing, and complex workflows
  - icon: 🎨
    title: Visual Builders
    details: Create powerful applications with our no-code visual interface and WYSIWYG editors
  - icon: 🔌
    title: Plugin System
    details: Extend your application with plugins and micro-frontends
  - icon: 🚀
    title: Launch in Days, Not Months
    details: Go from concept to a fully functional SaaS with users, billing, and workflows in under a week
  - icon: 🌐
    title: Multi-AI Support
    details: Switch between OpenAI, Anthropic, Gemini, and other AI providers without changing your code
  - icon: �
    title: Scale Without Limits
    details: Built for growth. Handle millions of users, process terabytes of data, and maintain 99.9% uptime
---

## Quick Start

Get up and running with Qelos locally:

```bash
# Clone the repository
git clone https://github.com/qelos-io/qelos.git

# Install dependencies
pnpm install

# Build the packages
pnpm build

# Start the development environment (includes MongoDB)
pnpm dev

# Create initial data (in a new terminal)
pnpm populate-db
```

This will create your first tenant and admin user to get started.

To create a new plugin:

```bash
# Create a new Qelos plugin
pnpm init play@latest my-plugin
```

## Popular Guides

<div class="vp-doc" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px;">

<div class="custom-card">
  <h3>🏗️ Installation</h3>
  <p>Set up your development environment and install Qelos.</p>
  <a href="/getting-started/installation">Learn more →</a>
</div>

<div class="custom-card">
  <h3>🎯 Create Blueprints</h3>
  <p>Design and implement your application's data models.</p>
  <a href="/getting-started/create-blueprints">Learn more →</a>
</div>

<div class="custom-card">
  <h3>🔌 Build Plugins</h3>
  <p>Extend your application with custom plugins.</p>
  <a href="/getting-started/create-your-first-plugin">Learn more →</a>
</div>

<div class="custom-card">
  <h3>⚡ CLI Tool</h3>
  <p>Manage and sync resources between local and remote instances.</p>
  <a href="/cli/">Learn more →</a>
</div>

<div class="custom-card">
  <h3>📚 SDK Reference</h3>
  <p>Integrate QELOS into your applications programmatically.</p>
  <a href="/sdk/sdk">Learn more →</a>
</div>

<div class="custom-card">
  <h3>🌟 Template Ecosystem</h3>
  <p>Build beautiful interfaces with pre-designed components and PubSub events.</p>
  <a href="/pre-designed-frontends/components/">Learn more →</a>
</div>

</div>

<style>
.custom-card {
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  transition: all 0.3s;
}

.custom-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 12px 0 var(--vp-c-divider);
}

.custom-card h3 {
  margin-top: 0;
}

.custom-card a {
  color: var(--vp-c-brand);
  text-decoration: none;
  font-weight: 500;
}

.custom-card a:hover {
  text-decoration: underline;
}
</style>
