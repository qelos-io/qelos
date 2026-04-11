---
title: API Reference
editLink: true
---
# API Reference

The Qelos platform exposes a RESTful HTTP API that powers all platform functionality. Every operation available through the [TypeScript SDK](/sdk/sdk) maps directly to an API endpoint documented here.

## Base URL

All endpoints are relative to your Qelos application URL:

```
https://your-qelos-app.com/api/...
```

## Authentication

Most endpoints require authentication. Qelos supports three authentication mechanisms:

| Method | Header / Mechanism | Description |
|---|---|---|
| **Session cookie** | `Cookie` (set by `POST /api/signin`) | Browser-based session authentication |
| **OAuth tokens** | `Authorization: Bearer <accessToken>` | Token-based authentication with automatic refresh |
| **API token** | `x-api-key: <apiToken>` | Long-lived tokens for scripts, CI/CD, and plugins |

See the [Authentication API](/api/authentication) for details on obtaining credentials.

> **SDK equivalent:** [SDK Authentication](/sdk/authentication)

## Common Patterns

### Request Format

- `Content-Type: application/json` for all request bodies
- Query parameters use standard URL encoding
- Path parameters are indicated with `{paramName}` in endpoint paths

### Response Format

All responses return JSON. Successful responses return the resource directly or wrapped in a standard envelope. Error responses follow this structure:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request (invalid parameters) |
| `401` | Unauthorized (missing or invalid credentials) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Resource not found |
| `500` | Internal server error |

### Query Parameters

Many list endpoints support common query parameters:

| Parameter | Type | Description |
|---|---|---|
| `$limit` | `number` | Maximum number of results to return |
| `$skip` | `number` | Number of results to skip (for pagination) |
| `$sort` | `string` | Sort field (prefix with `-` for descending) |
| `$flat` | `boolean` | Return flat entity structure |
| `$populate` | `boolean` | Populate related references |

## API Sections

### Core
- [Authentication](/api/authentication) — Sign in, sign up, token management, and user profile
- [Workspaces](/api/workspaces) — Multi-tenant workspace operations
- [Invites](/api/invites) — Workspace invitation handling

### Data
- [Blueprints](/api/blueprints) — Data model definitions and analytics
- [Blueprint Entities](/api/blueprint-entities) — CRUD operations on blueprint data
- [Blocks](/api/blocks) — Content block management
- [Configurations](/api/configurations) — Application configuration settings

### Execution
- [Webhooks / Lambdas](/api/webhooks) — Execute serverless functions and webhooks

### Payments
- [Payments](/api/payments) — Plans, subscriptions, invoices, and checkout

### AI
- [AI Threads](/api/ai-threads) — Conversation thread management
- [AI Chat](/api/ai-chat) — Chat completions and streaming
- [AI RAG](/api/ai-rag) — Vector storage for Retrieval-Augmented Generation

## SDK ↔ API Mapping

Every SDK method corresponds to an API endpoint. Each API page links back to the relevant SDK documentation, and vice versa.

| SDK Module | API Section |
|---|---|
| [`sdk.authentication`](/sdk/authentication) | [Authentication API](/api/authentication) |
| [`sdk.workspaces`](/sdk/managing_workspaces) | [Workspaces API](/api/workspaces) |
| [`sdk.invites`](/sdk/managing_invites) | [Invites API](/api/invites) |
| [`sdk.blueprints`](/sdk/blueprints_operations) | [Blueprints API](/api/blueprints) |
| [`sdk.blueprints.entitiesOf()`](/sdk/blueprints_operations#working-with-blueprint-entities) | [Blueprint Entities API](/api/blueprint-entities) |
| [`sdk.blocks`](/sdk/managing_blocks) | [Blocks API](/api/blocks) |
| [`sdk.appConfigurations`](/sdk/managing_configurations) | [Configurations API](/api/configurations) |
| [`sdk.lambdas`](/sdk/execute_lambdas) | [Webhooks / Lambdas API](/api/webhooks) |
| [`sdk.payments`](/sdk/blueprints_operations) | [Payments API](/api/payments) |
| [`sdk.ai.threads`](/sdk/ai_operations#thread-operations) | [AI Threads API](/api/ai-threads) |
| [`sdk.ai.chat`](/sdk/ai_operations#chat-completion-operations) | [AI Chat API](/api/ai-chat) |
| [`sdk.ai.rag`](/sdk/ai_operations#rag-retrieval-augmented-generation-operations) | [AI RAG API](/api/ai-rag) |
