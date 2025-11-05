---
title: Plugin Play - Introduction
---

# {{ $frontmatter.title }}

Plugin Play (`@qelos/plugin-play`) is a powerful web framework built on top of Fastify that simplifies the creation of backend micro-services that integrate with Qelos applications. It provides a complete toolkit for building plugins with minimal boilerplate.

## Key Features

- **Event Subscriptions**: Subscribe to platform events and react to changes in real-time
- **API Endpoints**: Easily add authenticated and proxy endpoints
- **Micro-Frontends**: Register iframe-based UI components
- **CRUD Operations**: Auto-generate REST APIs with built-in validation
- **Authentication**: Built-in JWT authentication and session management
- **SDK Integration**: Seamless integration with Qelos SDK for API calls
- **Lifecycle Hooks**: Hook into application lifecycle events
- **Cache Management**: Built-in Redis caching support
- **TypeScript**: Full TypeScript support with type definitions

## Use Cases

Plugin Play is ideal for:

- Building backend services that extend Qelos functionality
- Creating plugins that respond to platform events
- Developing micro-services with CRUD operations
- Building integrations with third-party services
- Creating custom business logic that integrates with Qelos

## Architecture

```
┌─────────────────────────────────────────────┐
│         Qelos Platform                      │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │   Your Plugin (Plugin Play)           │ │
│  │                                       │ │
│  │  • Event Handlers                     │ │
│  │  • API Endpoints                      │ │
│  │  • Micro-Frontends                    │ │
│  │  • CRUD Operations                    │ │
│  │  • SDK Integration                    │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Installation

Install Plugin Play using your preferred package manager:

```bash
npm install @qelos/plugin-play
# or
yarn add @qelos/plugin-play
# or
pnpm add @qelos/plugin-play
```

## Quick Start

Here's a minimal example of creating a plugin with Plugin Play:

```typescript
import { start, configure, addEndpoint, registerToHook } from '@qelos/plugin-play';

// Configure your plugin
configure({
  name: 'My Plugin',
  version: '1.0.0',
  description: 'A sample plugin',
  manifestUrl: '/manifest.json',
  proxyPath: '/api/proxy'
}, {
  qelosUrl: process.env.QELOS_URL,
  qelosUsername: process.env.QELOS_USERNAME,
  qelosPassword: process.env.QELOS_PASSWORD
});

// Add an endpoint
addEndpoint('/api/hello', {
  method: 'GET',
  handler: async (request, reply) => {
    return { message: 'Hello from my plugin!' };
  }
});

// Subscribe to events
registerToHook({
  eventName: 'user.created'
}, async (request, reply) => {
  const { user } = request.body;
  console.log('New user created:', user);
  return { received: true };
});

// Start the server
start();
```

## Core Concepts

### Manifest

Every plugin has a manifest that describes its capabilities, endpoints, micro-frontends, and event subscriptions. Plugin Play automatically generates and serves this manifest.

### Event Subscriptions

Plugins can subscribe to platform events (like user creation, data updates, etc.) and react accordingly. Event handlers are automatically registered and exposed via webhooks.

### Proxy Endpoints

Proxy endpoints are authenticated endpoints that can be called from the Qelos platform. They automatically verify access tokens and provide user context.

### Micro-Frontends

Plugins can register UI components (micro-frontends) that are displayed within the Qelos interface. These can be routes, modals, or global components.

### CRUD Operations

Plugin Play can auto-generate complete CRUD APIs with validation, permissions, and UI screens for your data models.

## Framework Features

### Built on Fastify

Plugin Play is built on Fastify, one of the fastest Node.js web frameworks:
- High performance
- Low overhead
- Extensive plugin ecosystem
- Full TypeScript support

### Authentication

Built-in JWT authentication with:
- Access token verification
- Refresh token handling
- Cookie-based sessions for frontends
- Multi-tenant support

### SDK Integration

Automatic SDK instance creation for:
- Making API calls to Qelos
- Per-tenant SDK instances
- Automatic token management

### Caching

Built-in Redis caching with:
- Automatic cache key generation
- TTL support
- Cache invalidation
- Multi-tenant cache isolation

## Documentation Structure

- [Installation & Setup](./installation.md) - Get started with Plugin Play
- [Configuration](./configuration.md) - Configure your plugin
- [Endpoints](./endpoints.md) - Add API endpoints
- [Event Subscriptions](./events.md) - Subscribe to platform events
- [Micro-Frontends](./micro-frontends.md) - Register UI components
- [CRUD Operations](./crud.md) - Auto-generate CRUD APIs
- [Authentication](./authentication.md) - Handle authentication
- [SDK Integration](./sdk-integration.md) - Use the Qelos SDK
- [Lifecycle Hooks](./lifecycle.md) - Hook into application lifecycle
- [API Reference](./api-reference.md) - Complete API documentation
- [Examples](./examples.md) - Practical examples

## Requirements

- Node.js 18+ (for built-in fetch support)
- Redis (optional, for caching)
- Qelos application credentials

## TypeScript Support

Plugin Play is written in TypeScript and provides full type definitions:

```typescript
import type { 
  FastifyRequest, 
  FastifyReply 
} from 'fastify';
import { 
  addEndpoint, 
  MicroFrontend,
  Crud 
} from '@qelos/plugin-play';

// Full type safety
addEndpoint('/api/users', {
  method: 'GET',
  handler: async (request: FastifyRequest, reply: FastifyReply) => {
    // TypeScript knows the types
    return { users: [] };
  }
});
```

## Next Steps

- [Install and set up Plugin Play](./installation.md)
- [Learn about configuration](./configuration.md)
- [Create your first endpoint](./endpoints.md)
- [Subscribe to events](./events.md)
- [Explore complete examples](./examples.md)
