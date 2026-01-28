# Qelos AI SDK Structure

The Qelos AI SDK is organized into three sub-SDKs, each responsible for a specific domain of AI functionality. This modular structure provides better organization, improved maintainability, and clearer separation of concerns.

## Overview

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-instance.com',
  fetch: globalThis.fetch,
  accessToken: 'your-access-token'
});

// Access AI functionality through sub-SDKs
await sdk.ai.threads.create({ integration: 'id' });
await sdk.ai.chat.stream('id', options);
await sdk.ai.rag.uploadContent('sourceId', data);
```

## Sub-SDKs

### 1. Threads Sub-SDK (`sdk.ai.threads`)

Manages conversation threads for AI chat interactions.

#### Methods

| Method | Description | Return Type |
|--------|-------------|-------------|
| `create(data)` | Create a new thread | `Promise<IThread>` |
| `getOne(threadId)` | Get a specific thread by ID | `Promise<IThread>` |
| `list(options?)` | List threads with optional filters | `Promise<IThread[]>` |
| `delete(threadId)` | Delete a thread | `Promise<{ success: boolean }>` |

#### Example

```typescript
// Create a new thread
const thread = await sdk.ai.threads.create({
  integration: 'integration-id',
  title: 'Customer Support Chat'
});

// List threads for an integration
const threads = await sdk.ai.threads.list({
  integration: 'integration-id',
  limit: 10,
  page: 1
});
```

### 2. Chat Sub-SDK (`sdk.ai.chat`)

Handles chat completion operations, both streaming and non-streaming.

#### Methods

| Method | Description | Return Type |
|--------|-------------|-------------|
| `chat(integrationId, options)` | Non-streaming chat completion | `Promise<IChatCompletionResponse>` |
| `chatInThread(integrationId, threadId, options)` | Non-streaming chat in a thread | `Promise<IChatCompletionResponse>` |
| `stream(integrationId, options)` | Streaming chat completion | `Promise<ReadableStream<Uint8Array>>` |
| `streamInThread(integrationId, threadId, options)` | Streaming chat in a thread | `Promise<ReadableStream<Uint8Array>>` |
| `parseSSEStream(stream)` | Parse Server-Sent Events stream | `ISSEStreamProcessor` |

#### Example

```typescript
// Streaming chat
const stream = await sdk.ai.chat.stream('integration-id', {
  messages: [{ role: 'user', content: 'Hello!' }],
  model: 'gpt-4',
  queryParams: { bypassAdmin: true }
});

// Process the stream
for await (const chunk of sdk.ai.chat.parseSSEStream(stream)) {
  if (chunk.choices?.[0]?.delta?.content) {
    console.log(chunk.choices[0].delta.content);
  }
}
```

### 3. RAG Sub-SDK (`sdk.ai.rag`)

Manages vector storage for Retrieval-Augmented Generation (RAG) operations.

#### Methods

| Method | Description | Return Type |
|--------|-------------|-------------|
| `createStorage(sourceId, data)` | Create vector storage | `Promise<{ success: boolean, message: string, vectorStore: IVectorStore }>` |
| `uploadContent(sourceId, data)` | Upload content to vector storage | `Promise<{ success: boolean, message: string, fileId: string, vectorStoreId: string }>` |
| `clearStorage(sourceId, data)` | Clear files from vector storage | `Promise<{ success: boolean, message: string, clearedCount: number, vectorStoreId: string }>` |
| `getVectorStores(options?)` | Get vector stores (internal API) | `Promise<IVectorStore[]>` |
| `uploadContentInternal(sourceId, data)` | Upload content (internal API) | `Promise<{ success: boolean, message: string, fileId: string, vectorStoreId: string }>` |
| `clearStorageInternal(sourceId, data)` | Clear storage (internal API) | `Promise<{ success: boolean, message: string, clearedCount: number, vectorStoreId: string }>` |

#### Example

```typescript
// Create vector storage
const storage = await sdk.ai.rag.createStorage('source-id', {
  integrationId: 'integration-id',
  scope: 'thread',
  subjectId: 'thread-id',
  expirationAfterDays: 30
});

// Upload content
const upload = await sdk.ai.rag.uploadContent('source-id', {
  integrationId: 'integration-id',
  content: 'Your knowledge base content',
  fileName: 'knowledge.txt',
  metadata: { type: 'documentation' }
});
```

## Type Definitions

### Core Interfaces

```typescript
interface IMessage {
  role: string;
  content: string;
  timestamp?: Date | string;
  tool_calls?: any[];
  name?: string;
  tool_call_id?: string;
  function_call?: any;
  message_id?: string;
}

interface IThread {
  _id?: string;
  integration: string;
  title?: string;
  messages: IMessage[];
  messageSummaries: IMessageSummary[];
  created?: Date;
  updated?: Date;
  user?: string;
  workspace?: string;
}

interface IChatCompletionOptions {
  messages: IMessage[];
  model?: string;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  max_tokens?: number;
  response_format?: any;
  context?: Record<string, any>;
  stream?: boolean;
  queryParams?: Record<string, any>; // Additional query parameters
}
```

### RAG Interfaces

```typescript
interface IVectorStore {
  _id: string;
  scope: string;
  subjectId?: string;
  tenant: string;
  agent: string;
  externalId: string;
  expirationAfterDays?: number;
  created: Date;
}

interface ICreateVectorStorageRequest {
  integrationId: string;
  scope: 'thread' | 'user' | 'workspace' | 'tenant';
  subjectId?: string;
  expirationAfterDays?: number;
}
```

## File Structure

The AI SDK is split into multiple files for better organization:

```
/packages/sdk/src/ai/
├── index.ts      - Main entry point, exports all sub-SDKs and types
├── types.ts      - All AI-related type definitions
├── threads.ts    - ThreadsSDK implementation
├── chat.ts       - ChatSDK implementation
└── rag.ts        - RAGSDK implementation
```

## Backward Compatibility

The SDK maintains backward compatibility through deprecated methods on the main `QlAI` class:

```typescript
// Deprecated methods (still work but not recommended)
await sdk.ai.createThread(data);      // → Use sdk.ai.threads.create()
await sdk.ai.getThread(id);           // → Use sdk.ai.threads.getOne()
await sdk.ai.streamChat(id, options); // → Use sdk.ai.chat.stream()
await sdk.ai.parseSSEStream(stream);  // → Use sdk.ai.chat.parseSSEStream()
```

## Query Parameters

The `IChatCompletionOptions` interface includes an optional `queryParams` field for passing additional query parameters:

```typescript
await sdk.ai.chat.stream('integration-id', {
  messages: [{ role: 'user', content: 'Hello!' }],
  queryParams: {
    bypassAdmin: true,
    customParam: 'value'
  }
});
```

## Best Practices

1. **Use Sub-SDKs Directly**: Prefer `sdk.ai.threads.create()` over deprecated methods
2. **Handle Streaming Properly**: Always use `parseSSEStream()` for streaming responses
3. **Clean Up RAG Storage**: Use `clearStorage()` to remove outdated content
4. **Type Safety**: Leverage TypeScript interfaces for better development experience
5. **Error Handling**: Implement proper error handling for all API calls

## Migration Guide

See [AI SDK Migration Guide](../sdk/ai_operations.md) for detailed migration instructions from the old API to the new sub-SDK structure.
