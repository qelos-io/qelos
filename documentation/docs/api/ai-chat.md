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

---

## Client Tool Calls (SSE event)

When a request includes `clientTools` (see [Chat Completion](#chat-completion) request body), the model may decide to call one of them instead of (or alongside) any server-side tools. Client tools are never executed by Qelos — execution is the caller's responsibility, since these tools only make sense in the context of the calling app (rendering a UI widget, reading `navigator.geolocation`, etc.).

In the **streaming** response, this is signaled by a dedicated SSE event instead of a normal content `delta`:

```
data: {"type":"client_tool_calls","functionCalls":[{"id":"call_abc123","type":"function","function":{"name":"confirm","arguments":"{\"message\":\"Proceed with the refund?\"}"}}],"backendResults":[],"assistantToolCalls":[{"id":"call_abc123","type":"function","function":{"name":"confirm","arguments":"{\"message\":\"Proceed with the refund?\"}"}}]}

data: [DONE]
```

| Field | Type | Description |
|---|---|---|
| `type` | `"client_tool_calls"` | Discriminator for this event |
| `functionCalls` | `Array<{ id, type: 'function', function: { name, arguments } }>` | The client tool call(s) the model made this turn. `arguments` is a JSON-encoded string |
| `backendResults` | `Array<{ functionCall, result }>` | Any **server-side** tool calls the model made in the *same* turn — already executed, included here so the client doesn't have to re-derive them |
| `assistantToolCalls` | `Array<{ id, type, function }>` | The full, unsplit list of tool calls the model made this turn (client + backend combined), for reconstructing the assistant message |

The stream ends immediately after this event — the AI service pauses the conversation until the client resolves the call. To continue:

1. Execute the tool locally (or render a UI widget and wait for the user's input).
2. Send a new request with the original messages plus:
   - An `assistant` message carrying `tool_calls: assistantToolCalls`.
   - One `tool`-role message per entry in `functionCalls`, with `tool_call_id` set to the call's `id` and `content` set to the (string) result.

```json
{
  "messages": [
    { "role": "user", "content": "Can you refund my last order?" },
    {
      "role": "assistant",
      "content": "",
      "tool_calls": [
        { "id": "call_abc123", "type": "function", "function": { "name": "confirm", "arguments": "{\"message\":\"Proceed with the refund?\"}" } }
      ]
    },
    { "role": "tool", "tool_call_id": "call_abc123", "content": "yes" }
  ],
  "stream": true
}
```

Object results should be JSON-stringified before being placed in `content` — `content` is always a string.

> **SDK / component:** [`sdk.ai.chat`](/sdk/sdk_reference#client-tools-clienttools--client-side-function-calls) documents the raw request/response shapes; the [`<AiChat>` component](/pre-designed-frontends/components/ai-chat#predefined-interactive-tools) and the [AI Agents guide](/ai/agents#7-client-tools-local-function-execution) handle this whole call/resolve/re-call loop for you, including 8 built-in interactive UI widgets.
