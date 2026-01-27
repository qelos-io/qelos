---
title: AI Operations
editLink: true
---
# AI Operations

The AI module provides comprehensive functionality for managing AI-powered conversations, threads, and chat completions within your Qelos application. This module enables you to build sophisticated AI-driven features with support for both streaming and non-streaming chat completions.

## Key Features

- **Thread Management**: Create, retrieve, update, and delete conversation threads
- **Chat Completions**: Execute AI chat completions with or without thread context
- **Streaming Support**: Real-time streaming chat completions with Server-Sent Events
- **Context Management**: Maintain conversation context across multiple interactions
- **Integration Support**: Works with various AI providers through Qelos integrations

## Thread Operations

### Creating Threads

Create a new conversation thread to maintain context across multiple AI interactions:

```typescript
// Create a new thread
const thread = await sdk.ai.createThread({
  integration: 'your-integration-id',
  title: 'Customer Support Chat' // Optional
});

console.log('Thread created:', thread._id);
```

### Retrieving Threads

Get a specific thread by its ID:

```typescript
// Get a specific thread
const thread = await sdk.ai.getThread('thread-id');
console.log('Thread messages:', thread.messages);
```

### Listing Threads

Retrieve multiple threads with filtering options:

```typescript
// List threads with filters
const result = await sdk.ai.listThreads({
  integration: 'integration-id',
  limit: 20,
  page: 1,
  sort: '-created', // Sort by creation date (newest first)
  user: 'user-id', // Filter by user
  workspace: 'workspace-id' // Filter by workspace
});

console.log(`Found ${result.total} threads`);
result.threads.forEach(thread => {
  console.log(`- ${thread.title}: ${thread.messages.length} messages`);
});
```

### Deleting Threads

Remove a thread when it's no longer needed:

```typescript
// Delete a thread
const result = await sdk.ai.deleteThread('thread-id');
console.log('Thread deleted:', result.success);
```

## Chat Completion Operations

### Basic Chat Completion

Execute a chat completion without thread context:

```typescript
// Simple chat completion
const response = await sdk.ai.chat('integration-id', {
  messages: [
    { role: 'user', content: 'Hello, how can you help me?' }
  ],
  temperature: 0.7,
  model: 'gpt-4' // Optional, uses integration default if not specified
});

console.log('AI Response:', response.choices[0].message.content);
```

### Chat Completion with Thread

Execute a chat completion within a thread context to maintain conversation history:

```typescript
// Chat completion with thread context
const response = await sdk.ai.chatInThread(
  'integration-id',
  'thread-id',
  {
    messages: [
      { role: 'user', content: 'Continue our previous conversation' }
    ],
    temperature: 0.7
  }
);

console.log('AI Response:', response.choices[0].message.content);
```

### Advanced Chat Options

Use advanced options for fine-tuned control:

```typescript
const response = await sdk.ai.chat('integration-id', {
  messages: [
    { role: 'system', content: 'You are a helpful customer service agent.' },
    { role: 'user', content: 'I need help with my order' }
  ],
  model: 'gpt-4',
  temperature: 0.3,
  top_p: 0.9,
  frequency_penalty: 0.1,
  presence_penalty: 0.1,
  max_tokens: 500,
  stop: ['END_CONVERSATION'],
  context: {
    userId: 'user-123',
    orderNumber: 'ORD-456'
  }
});
```

## Streaming Chat Completions

### Basic Streaming

For real-time AI responses, use streaming chat completions:

```typescript
// Start streaming chat completion
const stream = await sdk.ai.streamChat('integration-id', {
  messages: [
    { role: 'user', content: 'Tell me a long story' }
  ],
  temperature: 0.8
});

// Process the stream
for await (const chunk of sdk.ai.parseSSEStream(stream)) {
  if (chunk.choices?.[0]?.delta?.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
```

### Streaming with Thread Context

Combine streaming with thread context for real-time conversational AI:

```typescript
// Streaming chat with thread
const stream = await sdk.ai.streamChatInThread(
  'integration-id',
  'thread-id',
  {
    messages: [
      { role: 'user', content: 'Continue the story from where we left off' }
    ]
  }
);

// Process streaming response
for await (const chunk of sdk.ai.parseSSEStream(stream)) {
  if (chunk.type === 'content') {
    console.log('New content:', chunk.choices[0].delta.content);
  } else if (chunk.type === 'function_call') {
    console.log('Function call detected:', chunk.function_call);
  }
}
```

### Advanced Stream Processing

The SDK's `parseSSEStream()` method includes robust buffering and error handling:

```typescript
const stream = await sdk.ai.streamChat('integration-id', options);
const reader = stream.getReader();
const decoder = new TextDecoder();

try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        
        try {
          const parsed = JSON.parse(data);
          console.log('Received:', parsed);
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }
} finally {
  reader.releaseLock();
}
```

## TypeScript Interfaces

### IThread

```typescript
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
```

### IMessage

```typescript
interface IMessage {
  role: string; // 'user', 'assistant', 'system', 'tool'
  content: string;
  timestamp?: Date;
  tool_calls?: any[];
  name?: string;
  tool_call_id?: string;
  function_call?: any;
  message_id?: string;
}
```

### IChatCompletionOptions

```typescript
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
}
```

### IChatCompletionResponse

```typescript
interface IChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: IMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

## Complete Example: AI Chat Application

Here's a complete example of building a simple AI chat application:

```typescript
import QelosSDK from '@qelos/sdk';

class AIChatApp {
  private sdk: QelosSDK;
  private currentThread: string | null = null;
  private integrationId: string;

  constructor(appUrl: string, integrationId: string) {
    this.sdk = new QelosSDK({
      appUrl,
      fetch: globalThis.fetch,
      forceRefresh: true
    });
    this.integrationId = integrationId;
  }

  async authenticate(username: string, password: string) {
    await this.sdk.authentication.oAuthSignin({ username, password });
  }

  async startNewConversation(title?: string) {
    const thread = await this.sdk.ai.createThread({
      integration: this.integrationId,
      title: title || `Chat ${new Date().toLocaleString()}`
    });
    
    this.currentThread = thread._id!;
    return thread;
  }

  async sendMessage(message: string): Promise<string> {
    if (!this.currentThread) {
      await this.startNewConversation();
    }

    const response = await this.sdk.ai.chatInThread(
      this.integrationId,
      this.currentThread!,
      {
        messages: [{ role: 'user', content: message }],
        temperature: 0.7
      }
    );

    return response.choices[0].message.content;
  }

  async sendStreamingMessage(
    message: string,
    onChunk: (content: string) => void
  ): Promise<void> {
    if (!this.currentThread) {
      await this.startNewConversation();
    }

    const stream = await this.sdk.ai.streamChatInThread(
      this.integrationId,
      this.currentThread!,
      {
        messages: [{ role: 'user', content: message }],
        temperature: 0.7
      }
    );

    for await (const chunk of this.sdk.ai.parseSSEStream(stream)) {
      if (chunk.choices?.[0]?.delta?.content) {
        onChunk(chunk.choices[0].delta.content);
      }
    }
  }

  async getConversationHistory() {
    if (!this.currentThread) return [];
    
    const thread = await this.sdk.ai.getThread(this.currentThread);
    return thread.messages;
  }

  async listPreviousChats() {
    const result = await this.sdk.ai.listThreads({
      integration: this.integrationId,
      limit: 50,
      sort: '-created'
    });
    
    return result.threads;
  }
}

// Usage
const chatApp = new AIChatApp('https://your-app.com', 'your-integration-id');

// Authenticate
await chatApp.authenticate('user@example.com', 'password');

// Start chatting
const response = await chatApp.sendMessage('Hello, how are you?');
console.log('AI:', response);

// Stream a response
await chatApp.sendStreamingMessage('Tell me a story', (chunk) => {
  process.stdout.write(chunk);
});
```

## Error Handling

The AI module follows the same error handling patterns as other SDK modules:

```typescript
try {
  const response = await sdk.ai.chat('integration-id', {
    messages: [{ role: 'user', content: 'Hello' }]
  });
} catch (error) {
  if (error.message.includes('404')) {
    console.error('Integration not found');
  } else if (error.message.includes('401')) {
    console.error('Authentication required');
  } else {
    console.error('AI request failed:', error.message);
  }
}
```

## Best Practices

### Thread Management
- Create threads for conversations that need context
- Use descriptive titles for better organization
- Clean up old threads periodically to manage storage

### Performance Optimization
- Use streaming for long responses to improve user experience
- Implement proper error handling for network issues
- Consider implementing retry logic for failed requests

### Context Management
- Use the `context` parameter to pass relevant user/session data
- Keep message history reasonable to avoid token limits
- Implement message summarization for very long conversations

### Security
- Never expose sensitive data in message content
- Use proper authentication before AI operations
- Validate user permissions for thread access

## Related Documentation

- [Authentication](./authentication.md) - User authentication setup
- [Error Handling](./error_handling.md) - Error handling patterns
- [TypeScript Types](./typescript_types.md) - Complete type definitions

## ThreadsList Component

The ThreadsList component provides a ready-to-use interface for displaying and managing AI chat threads in your Qelos application. It includes pagination, thread actions, and responsive design.

### Features

- **Thread Display**: Shows threads in a responsive grid layout with title, metadata, and message preview
- **Pagination**: Built-in pagination for handling large numbers of threads
- **Thread Actions**: Create new threads, select existing threads, and delete threads with confirmation
- **Responsive Design**: Adapts to different screen sizes with mobile-friendly layout
- **SDK Integration**: Uses the Qelos SDK for all thread operations

### Component Usage

```vue
<template>
  <ThreadsList
    title="Chat Threads"
    :show-header="true"
    :allow-create="true"
    :allow-delete="true"
    integration="your-integration-id"
    :limit="20"
    :auto-load="true"
    @create-thread="handleCreateThread"
    @select-thread="handleSelectThread"
    @thread-deleted="handleThreadDeleted"
  />
</template>

<script setup lang="ts">
import ThreadsList from '@/modules/pre-designed/components/ThreadsList.vue'

function handleCreateThread() {
  // Navigate to thread creation or open modal
  console.log('Create new thread requested')
}

function handleSelectThread(thread) {
  // Navigate to selected thread or open in chat component
  console.log('Thread selected:', thread._id)
}

function handleThreadDeleted(threadId) {
  // Handle thread deletion completion
  console.log('Thread deleted:', threadId)
}
</script>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'Threads'` | Header title displayed above the threads list |
| `show-header` | `boolean` | `true` | Whether to show the header with title and create button |
| `allow-create` | `boolean` | `true` | Whether to show the "Create New Thread" button |
| `allow-delete` | `boolean` | `true` | Whether to show delete buttons on thread cards |
| `integration` | `string` | `undefined` | Optional integration ID to filter threads by |
| `limit` | `number` | `20` | Number of threads per page |
| `auto-load` | `boolean` | `true` | Whether to automatically load threads on component mount |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `create-thread` | `void` | Emitted when the "Create New Thread" button is clicked |
| `select-thread` | `thread: IThread` | Emitted when a thread card is clicked |
| `thread-deleted` | `threadId: string` | Emitted after a thread is successfully deleted |

### SDK Methods Used

The component internally uses these SDK methods:

```typescript
// List threads with pagination
const result = await sdk.ai.listThreads({
  integration: props.integration,
  limit: props.limit,
  page: currentPage,
  sort: '-updated'
});

// Delete a thread
await sdk.ai.deleteThread(threadId);
```

### Styling

The component uses scoped CSS with Element Plus design tokens and includes:

- Responsive grid layout (300px minimum card width)
- Hover effects and transitions
- Mobile-friendly design (single column on small screens)
- Color-coded status indicators
- Loading states and empty states

### Integration with AiChat Component

The ThreadsList component works seamlessly with the AiChat component:

```vue
<template>
  <div class="chat-interface">
    <ThreadsList
      v-if="!selectedThreadId"
      @select-thread="selectThread"
    />
    <AiChat
      v-else
      :thread-id="selectedThreadId"
      @back="selectedThreadId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ThreadsList from '@/modules/pre-designed/components/ThreadsList.vue'
import AiChat from '@/modules/pre-designed/components/AiChat.vue'

const selectedThreadId = ref<string>()

function selectThread(thread) {
  selectedThreadId.value = thread._id
}
</script>
```

### Advanced Usage

#### Custom Thread Filtering

```vue
<template>
  <ThreadsList
    integration="customer-support-integration"
    :limit="10"
    @select-thread="loadCustomerThread"
  />
</template>
```

#### Programmatic Thread Refresh

```vue
<template>
  <div>
    <ThreadsList ref="threadsListRef" />
    <el-button @click="refreshThreads">Refresh</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ThreadsList from '@/modules/pre-designed/components/ThreadsList.vue'

const threadsListRef = ref()

function refreshThreads() {
  threadsListRef.value?.refresh()
}
</script>
```

## Related Documentation

- [Authentication](./authentication.md) - User authentication setup
- [Error Handling](./error_handling.md) - Error handling patterns
- [TypeScript Types](./typescript_types.md) - Complete type definitions
- [AiChat Component](../pre-designed-frontends/components/ai-chat.md) - AI chat interface component
