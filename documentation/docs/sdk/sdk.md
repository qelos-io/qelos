---
title: Introduction to the SDK
editLink: true
---

# {{ $frontmatter.title }}

Welcome to the Qelos SDK documentation. This section provides an overview of the SDK, including its core features, installation, and basic usage. Whether you are a developer or an administrator, this guide will help you get started with the SDK.

## Key Features

<div class="vp-features">
  <div class="vp-feature">
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v5.7c0 4.83-3.4 9.19-7 10.3c-3.6-1.11-7-5.47-7-10.3V6.3l7-3.12zm-1 8.32l-4-4l-1.41 1.41L9 12.32l6.71-6.71l1.41 1.41L11 11.5z"/></svg>
    </div>
    <h3><a href="/sdk/authentication">Authentication</a></h3>
    <p>Secure user authentication with OAuth and session-based options. Includes automatic token refresh and session management.</p>
  </div>
  <div class="vp-feature">
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M21 10h-8.35A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H13l2 2l2-2l2 2l4-4.04L21 10zM7 15c-1.65 0-3-1.35-3-3s1.35-3 3-3s3 1.35 3 3s-1.35 3-3 3z"/></svg>
    </div>
    <h3><a href="/sdk/token_refresh">Token Management</a></h3>
    <p>Automatic token refresh functionality to maintain user sessions without interruption.</p>
  </div>
  <div class="vp-feature">
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
    </div>
    <h3><a href="/sdk/blueprints_operations">Blueprints</a></h3>
    <p>Create and manage data models with powerful blueprint operations for your application.</p>
  </div>
  <div class="vp-feature">
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94c0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6s-1.62 3.6-3.6 3.6z"/></svg>
    </div>
    <h3><a href="/sdk/managing_configurations">Configurations</a></h3>
    <p>Manage application configurations with easy-to-use APIs for retrieval and updates.</p>
  </div>
  <div class="vp-feature">
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M3 9h4V5H3v4zm0 5h4v-4H3v4zm5 0h4v-4H8v4zm5 0h4v-4h-4v4zM8 9h4V5H8v4zm5-4v4h4V5h-4zm5 9h4v-4h-4v4zm0 5h4v-4h-4v4zm-5 0h4v-4h-4v4zm-5 0h4v-4H8v4zm-5 0h4v-4H3v4z"/></svg>
    </div>
    <h3><a href="/sdk/managing_layouts">Layouts</a></h3>
    <p>Create and customize UI layouts for your Qelos-powered applications.</p>
  </div>
  <div class="vp-feature">
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z"/></svg>
    </div>
    <h3><a href="/sdk/managing_plugins">Plugins</a></h3>
    <p>Extend functionality with plugins to connect to other micro-SaaS platforms.</p>
  </div>
  <div class="vp-feature">
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M16 17v2H2v-2s0-4 7-4s7 4 7 4m-3.5-9.5A3.5 3.5 0 1 0 9 11a3.5 3.5 0 0 0 3.5-3.5m3.44 5.5A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4M15 4a3.39 3.39 0 0 0-1.93.59a5 5 0 0 1 0 5.82A3.39 3.39 0 0 0 15 11a3.5 3.5 0 0 0 0-7z"/></svg>
    </div>
    <h3><a href="/sdk/managing_users">User Management</a></h3>
    <p>Comprehensive APIs for managing users, permissions, and roles.</p>
  </div>
  <div class="vp-feature">
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3m6.82 6L12 12.72L5.18 9L12 5.28L18.82 9M17 16l-5 2.72L7 16v-3.73L12 15l5-2.73V16z"/></svg>
    </div>
    <h3><a href="/sdk/managing_workspaces">Workspace Management</a></h3>
    <p>Multi-tenant support with workspace management capabilities.</p>
  </div>
  <div class="vp-feature">
    <div class="icon-container">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
    </div>
    <h3><a href="/sdk/error_handling">Error Handling</a></h3>
    <p>Robust error handling patterns and best practices for reliable applications.</p>
  </div>
</div>

<style>
.vp-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin: 2rem 0;
}

.vp-feature {
  background-color: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s;
  border: 1px solid var(--vp-c-divider);
}

.vp-feature:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: var(--vp-c-brand);
}

.icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: var(--vp-c-brand-soft);
  margin-bottom: 16px;
}

.icon-container svg {
  color: var(--vp-c-brand);
}

.vp-feature h3 {
  margin-top: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.vp-feature p {
  margin-bottom: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
</style>

## Getting Started

### Installation

To install the Qelos SDK, use your preferred package manager:

```bash
npm install @qelos/sdk
# or
yarn add @qelos/sdk
# or
pnpm add @qelos/sdk
```

### Basic Setup

```typescript
import { QelosSDK } from '@qelos/sdk';

// Initialize the SDK
const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-app.com',
  forceRefresh: true, // Enable automatic token refresh
});

// Authenticate the user
await sdk.authentication.oAuthSignin({
  username: 'user@example.com',
  password: 'password'
});

// Now you can use the SDK to interact with Qelos
const workspaces = await sdk.workspaces.getList();
const userProfile = await sdk.authentication.getLoggedInUser();
```

### Developer Resources

<div class="vp-features">
  <div class="vp-feature">
    <h3><a href="/sdk/tutorials/authentication_flow">Authentication Tutorial</a></h3>
    <p>Learn how to implement a complete authentication flow in your application.</p>
  </div>
  <div class="vp-feature">
    <h3><a href="/sdk/typescript_types">TypeScript Types</a></h3>
    <p>Comprehensive guide to TypeScript types in the SDK for better development experience.</p>
  </div>
  <div class="vp-feature">
    <h3><a href="/sdk/troubleshooting">Troubleshooting</a></h3>
    <p>Solutions for common issues and debugging techniques.</p>
  </div>
</div>

## About Qelos

Qelos is a SaaS platform developed by Velocitech LTD that enables you to create your own SaaS applications with multi-tenant capabilities. The platform provides a comprehensive set of tools and APIs to build, deploy, and manage your applications efficiently.



