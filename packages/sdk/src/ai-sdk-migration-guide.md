# Qelos AI SDK Migration Guide

The Qelos AI SDK has been refactored to provide a more organized and intuitive API with three sub-SDKs:
- `threads` - Thread CRUD operations
- `chat` - Chat completion (streaming and non-streaming) and SSE parsing
- `rag` - Vector storage management for RAG (Retrieval-Augmented Generation)

## File Structure

The SDK is now split into multiple files for better organization:
```
/packages/sdk/src/ai/
├── index.ts      - Exports all sub-SDKs and types
├── types.ts      - All AI-related type definitions
├── threads.ts    - ThreadsSDK implementation
├── chat.ts       - ChatSDK implementation
└── rag.ts        - RAGSDK implementation
```

## New API Structure

### 1. Threads Sub-SDK

All thread-related operations are now available under `sdk.ai.threads`:

```typescript
// Create a new thread
const thread = await sdk.ai.threads.create({
  integration: 'integration-id',
  title: 'Optional title'
});

// Get a specific thread
const thread = await sdk.ai.threads.getOne('thread-id');

// List threads with filters
const threads = await sdk.ai.threads.list({
  integration: 'integration-id',
  limit: 10,
  page: 1
});

// Delete a thread
await sdk.ai.threads.delete('thread-id');
```

### 2. Chat Sub-SDK

All chat completion operations are now available under `sdk.ai.chat`:

```typescript
// Non-streaming chat
const response = await sdk.ai.chat.chat('integration-id', {
  messages: [{ role: 'user', content: 'Hello!' }],
  model: 'gpt-4',
  queryParams: { bypassAdmin: true } // Optional query parameters
});

// Non-streaming chat in thread
const response = await sdk.ai.chat.chatInThread('integration-id', 'thread-id', {
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Streaming chat
const stream = await sdk.ai.chat.stream('integration-id', {
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true
});

// Streaming chat in thread
const stream = await sdk.ai.chat.streamInThread('integration-id', 'thread-id', {
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true
});

// Parse SSE stream
const processor = sdk.ai.chat.parseSSEStream(stream);
for await (const chunk of processor) {
  console.log(chunk);
}
```

### 3. RAG Sub-SDK

All vector storage operations are now available under `sdk.ai.rag`:

```typescript
// Create vector storage
const result = await sdk.ai.rag.createStorage('source-id', {
  integrationId: 'integration-id',
  scope: 'thread', // 'thread' | 'user' | 'workspace' | 'tenant'
  subjectId: 'thread-id', // Required for non-tenant scopes
  expirationAfterDays: 30
});

// Upload content to storage
const uploadResult = await sdk.ai.rag.uploadContent('source-id', {
  integrationId: 'integration-id',
  content: 'Your content here', // Can be string or object
  fileName: 'document.txt',
  metadata: { type: 'documentation' }
});

// Clear files from storage
const clearResult = await sdk.ai.rag.clearStorage('source-id', {
  integrationId: 'integration-id',
  fileIds: ['file-id-1', 'file-id-2'] // Optional: clears all if not provided
});

// Get vector stores (internal API)
const stores = await sdk.ai.rag.getVectorStores({
  scope: 'thread',
  subjectId: 'thread-id'
});

// Internal API methods (for server-side use)
await sdk.ai.rag.uploadContentInternal('source-id', data);
await sdk.ai.rag.clearStorageInternal('source-id', data);
```

## Backward Compatibility

The old API methods are still available and marked as deprecated. They internally delegate to the new sub-SDKs:

```typescript
// These still work but are deprecated:
await sdk.ai.createThread(data); // → sdk.ai.threads.create(data)
await sdk.ai.getThread(id); // → sdk.ai.threads.getOne(id)
await sdk.ai.streamChat(id, options); // → sdk.ai.chat.stream(id, options)
await sdk.ai.parseSSEStream(stream); // → sdk.ai.chat.parseSSEStream(stream)
```

## Migration Benefits

1. **Better Organization**: Related functionality is grouped together
2. **Improved Discoverability**: IDE autocomplete shows relevant methods for each sub-SDK
3. **Type Safety**: Better TypeScript support with specific interfaces for each sub-domain
4. **Future-Proof**: Easy to extend each sub-SDK independently

## Updating Your Code

While the old API still works, we recommend updating to the new structure:

```typescript
// Old way
const thread = await sdk.ai.createThread({ integration: 'id' });
const stream = await sdk.ai.streamChat('id', options);
for await (const chunk of sdk.ai.parseSSEStream(stream)) {
  // process chunk
}

// New way
const thread = await sdk.ai.threads.create({ integration: 'id' });
const stream = await sdk.ai.chat.stream('id', options);
for await (const chunk of sdk.ai.chat.parseSSEStream(stream)) {
  // process chunk
}
```

## Query Parameters

The `IChatCompletionOptions` interface now includes an optional `queryParams` field for passing additional query parameters:

```typescript
await sdk.ai.chat.stream('integration-id', {
  messages: [{ role: 'user', content: 'Hello!' }],
  queryParams: {
    bypassAdmin: true,
    customParam: 'value'
  }
});
```
