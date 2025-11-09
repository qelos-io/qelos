---
layout: home
title: QELOS Documentation
editLink: true
hero:
  name: QELOS
  text: Build SaaS Applications with Ease
  tagline: A powerful platform for creating multi-tenant SaaS applications with built-in plugin system
  image:
    src: /qelos.svg
    alt: QELOS
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/intro
    - theme: alt
      text: View on GitHub
      link: https://github.com/qelos-io/qelos
features:
  - icon: 🚀
    title: Multi-Tenant Architecture
    details: Built-in support for multi-tenancy with isolated workspaces and configurations
  - icon: 🔌
    title: Plugin System
    details: Extend your application with plugins and micro-frontends
  - icon: 🎨
    title: No-Code Builder
    details: Create and customize blueprints without writing code
  - icon: 🔒
    title: Built-in Security
    details: Authentication, authorization, and secrets management out of the box
  - icon: 📦
    title: Modern Tech Stack
    details: Vue 3, Node.js, MongoDB, Redis, and more
  - icon: 🌐
    title: API-First Design
    details: RESTful APIs and SDK for seamless integration
---

## Quick Start

Get up and running with QELOS locally:

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
# Create a new QELOS plugin
pnpm init play@latest my-plugin
```

## Popular Guides

<div class="vp-doc" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px;">

<div class="custom-card">
  <h3>🏗️ Installation</h3>
  <p>Set up your development environment and install QELOS.</p>
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
  <h3>🎨 Design Settings</h3>
  <p>Customize your admin panel and user interface.</p>
  <a href="/getting-started/design-settings">Learn more →</a>
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
