---
title: AI Chat API
editLink: true
---
# AI Chat API

Endpoints for executing AI chat completions, with support for both standard and streaming responses, and optional thread context.

> **SDK equivalent:** [`sdk.ai.chat`](/sdk/ai_operations#chat-completion-operations)

## Chat Completion

Execute a chat completion without thread context.

```
POST /api/ai/{integrationId}/chat-completion
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `integrationId` | `string` | The AI integration ID |

### Request Body

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello, how can you help me?" }
  ],
  "model": "gpt-4",
  "temperature": 0.7,
  "top_p": 0.9,
  "max_tokens": 500,
  "frequency_penalty": 0.1,
  "presence_penalty": 0.1,
  "stop": ["END"],
  "context": {
    "userId": "user-123"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `messages` | `IMessage[]` | Yes | Array of conversation messages |
| `model` | `string` | No | Model to use (defaults to integration setting) |
| `temperature` | `number` | No | Sampling temperature (0–2) |
| `top_p` | `number` | No | Nucleus sampling parameter |
| `max_tokens` | `number` | No | Maximum tokens in the response |
| `frequency_penalty` | `number` | No | Frequency penalty (-2 to 2) |
| `presence_penalty` | `number` | No | Presence penalty (-2 to 2) |
| `stop` | `string \| string[]` | No | Stop sequences |
| `response_format` | `object` | No | Response format specification |
| `context` | `object` | No | Additional context data |
| `stream` | `boolean` | No | Set to `true` for streaming response |
| `clientTools` | `IClientTool[]` | No | Client-side tool definitions |
| `rules` | `string[]` | No | Additional rules for the AI |
| `queryParams` | `object` | No | Additional query parameters |

### Message Format

```json
{
  "role": "user | assistant | system | tool",
  "content": "Message text",
  "name": "optional-name",
  "tool_calls": [],
  "tool_call_id": "optional-tool-call-id"
}
```

### Response

```json
{
  "id": "completion-id",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I can help you with..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 50,
    "total_tokens": 75
  }
}
```

> **SDK:** [`sdk.ai.chat.chat(integrationId, options)`](/sdk/ai_operations#basic-chat-completion)

---

## Chat Completion in Thread

Execute a chat completion within a thread context. The thread's message history is automatically included.

```
POST /api/ai/{integrationId}/chat-completion/{threadId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `integrationId` | `string` | The AI integration ID |
| `threadId` | `string` | The thread ID for context |

### Request Body

Same as [Chat Completion](#chat-completion).

### Response

Same as [Chat Completion](#chat-completion). The new messages are automatically appended to the thread.

> **SDK:** [`sdk.ai.chat.chatInThread(integrationId, threadId, options)`](/sdk/ai_operations#chat-completion-with-thread)

---

## Streaming Chat Completion

Execute a streaming chat completion. Returns a Server-Sent Events (SSE) stream.

```
POST /api/ai/{integrationId}/chat-completion
```

### Headers

| Header | Value | Description |
|---|---|---|
| `Accept` | `text/event-stream` | Required for streaming responses |

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `integrationId` | `string` | The AI integration ID |

### Request Body

Same as [Chat Completion](#chat-completion), with `stream` set to `true`:

```json
{
  "messages": [
    { "role": "user", "content": "Tell me a story" }
  ],
  "stream": true,
  "temperature": 0.8
}
```

### Response

Returns a `text/event-stream` response. Each event contains a JSON chunk:

```
data: {"id":"completion-id","choices":[{"index":0,"delta":{"content":"Once"},"finish_reason":null}]}

data: {"id":"completion-id","choices":[{"index":0,"delta":{"content":" upon"},"finish_reason":null}]}

data: {"id":"completion-id","choices":[{"index":0,"delta":{"content":" a"},"finish_reason":null}]}

data: [DONE]
```

> **SDK:** [`sdk.ai.chat.stream(integrationId, options)`](/sdk/ai_operations#basic-streaming)

---

## Streaming Chat Completion in Thread

Execute a streaming chat completion with thread context.

```
POST /api/ai/{integrationId}/chat-completion/{threadId}
```

### Headers

| Header | Value | Description |
|---|---|---|
| `Accept` | `text/event-stream` | Required for streaming responses |

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `integrationId` | `string` | The AI integration ID |
| `threadId` | `string` | The thread ID for context |

### Request Body

Same as [Streaming Chat Completion](#streaming-chat-completion).

### Response

Returns a `text/event-stream` response (same format as streaming without thread).

> **SDK:** [`sdk.ai.chat.streamInThread(integrationId, threadId, options)`](/sdk/ai_operations#streaming-with-thread-context)
