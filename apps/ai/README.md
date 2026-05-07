# Qelos AI system service

An HTTP server to manage AI system.

## Dependencies
- Node.js
- npm OR yarn
- MongoDB
- [Secrets-service](https://github.com/qelos-io/qelos)
- [Plugins-service](https://github.com/qelos-io/qelos)

## Usage
### As a Docker container
```sh
$ docker run -p 9007:9007 qelos/ai
```

## Development and Independent Usage
In case you would like to run this project manually, for any reason, there are several commands you need to acknowledge:

### Install
```sh
$ pnpm install
```

### Launch
```sh
$ pnpm start
```

### Tests
```sh
$ pnpm test
```

Uses Node’s built-in test runner (`node:test`) with `tsx` for TypeScript files under `server/**/*.test.ts`.

## Agent management REST API

Authenticated tenant routes (same auth as other AI routes):

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ai/agents` | List chat-completion integrations (agents) for the tenant |
| `GET` | `/api/ai/agents/:id` | Agent details (model, tools, system prompt, sources) |
| `POST` | `/api/ai/agents` | Create agent — body requires `name`, `triggerSource`, `targetSource`; optional `model`, `systemPrompt`, `tools`, `temperature`, `maxTokens`, `workspace` |
| `PUT` | `/api/ai/agents/:id` | Update agent configuration |
| `DELETE` | `/api/ai/agents/:id` | Delete agent |
| `POST` | `/api/ai/agents/:id/chat` | Non-streaming chat — body: `{ messages: [...], threadId?: string, ... }`. Creates a thread when `threadId` is omitted, then runs chat completion. |
| `GET` | `/api/ai/agents/:id/chat` | SSE streaming — query: `messages` (JSON array) or `message` (single user string); optional `threadId` |

The chat routes delegate to the same `chat-completion` controller used by integration-based chat, after attaching a thread.

**SDK:** use `@qelos/sdk` → `sdk.ai.agents` (`list`, `get`, `create`, `update`, `remove`, `chat`, `streamChat`, etc.).
