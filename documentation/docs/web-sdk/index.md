---
title: Web SDK - Introduction
---

# {{ $frontmatter.title }}

The Qelos Web SDK (`@qelos/web-sdk`) is a lightweight JavaScript library designed for developers building micro-frontends that run inside iframes within a Qelos application. It provides seamless communication between your iframe-based application and the host Qelos application.

## Key Features

- **Authentication Management**: Handle user authentication and authorization within your micro-frontend
- **Event Communication**: Bidirectional event system for communication with the host application
- **Route Integration**: Navigate and respond to route changes in the host application
- **Modal Management**: Open and close modals in the host application
- **Shared Styling**: Automatically sync with the host application's theme and styles
- **User Context**: Access current user information and workspace context

## Use Cases

The Web SDK is ideal for:

- Building iframe-based micro-frontends that integrate with Qelos
- Creating isolated UI components that need to communicate with the parent application
- Developing third-party integrations that run within Qelos
- Building plugin interfaces that require user context and navigation

## Installation

Install the Web SDK using your preferred package manager:

```bash
npm install @qelos/web-sdk
# or
yarn add @qelos/web-sdk
# or
pnpm add @qelos/web-sdk
```

## Quick Start

Here's a minimal example of using the Web SDK in your micro-frontend:

```typescript
import { authorize, code } from '@qelos/web-sdk';

// Initialize authentication
const userData = await authorize();
console.log('Current user:', userData);
console.log('Session code:', code);

// Your application code here
```

## Architecture

The Web SDK uses the `postMessage` API for secure cross-origin communication between your iframe and the host Qelos application. All communication is event-based and follows a publish-subscribe pattern.

```
┌─────────────────────────────────────┐
│     Qelos Host Application          │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │   Your Micro-Frontend         │  │
│  │   (with @qelos/web-sdk)       │  │
│  │                               │  │
│  │   ↕ postMessage API           │  │
│  │                               │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Core Concepts

### Session Code

Every iframe instance receives a unique `code` parameter that identifies the session. This code is used for authentication and authorization.

### Event System

The SDK provides a simple event system for bidirectional communication:
- **dispatch**: Send events to the host application
- **on**: Listen for events from the host application

### Authorization Flow

1. Your micro-frontend loads with a `code` parameter
2. Call `authorize()` to authenticate the session
3. Receive user data and workspace context
4. Use the SDK features to interact with the host

## Documentation Structure

- [Installation & Setup](./installation.md) - Detailed installation and configuration
- [Authentication](./authentication.md) - User authentication and session management
- [Event Communication](./events.md) - Sending and receiving events
- [Router Integration](./router.md) - Navigation and route management
- [Modals](./modals.md) - Opening and closing modals
- [Styling](./styling.md) - Shared styles and theming
- [API Reference](./api-reference.md) - Complete API documentation
- [Examples](./examples.md) - Practical examples and use cases

## Browser Support

The Web SDK supports all modern browsers that implement the `postMessage` API:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## TypeScript Support

The Web SDK is written in TypeScript and provides full type definitions out of the box.

## Next Steps

- [Get started with installation](./installation.md)
- [Learn about authentication](./authentication.md)
- [Explore the API reference](./api-reference.md)
