---
title: ThreadsList Component
editLink: true
---
# ThreadsList Component

The ThreadsList component provides a comprehensive interface for displaying and managing AI chat threads in your Qelos application. It features a responsive grid layout, thread actions, and seamless integration with the Qelos AI SDK.

## Features

- **Thread Display**: Shows threads in a responsive card grid with title and metadata
- **Thread Actions**: Create new threads, select existing threads, and delete threads with confirmation
- **Responsive Design**: Mobile-friendly layout that adapts to different screen sizes
- **SDK Integration**: Uses the Qelos SDK for all thread operations
- **Loading States**: Proper loading indicators and empty state handling
- **Event System**: Emits events for thread lifecycle actions

## Usage

### Basic Usage

```vue
<template>
  <ThreadsList
    v-model:selected="selectedThreadId"
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
import { ref } from 'vue'
import ThreadsList from '@/modules/pre-designed/components/ThreadsList.vue'

const selectedThreadId = ref<string>('')

function handleCreateThread(thread) {
  // Handle thread creation
  console.log('Thread created:', thread)
}

function handleSelectThread(thread) {
  // Navigate to selected thread or open in chat component
  console.log('Thread selected:', thread._id)
  // The selectedThreadId is automatically updated by v-model
}

function handleThreadDeleted(threadId) {
  // Handle thread deletion completion
  console.log('Thread deleted:', threadId)
  // If the deleted thread was selected, clear the selection
  if (selectedThreadId.value === threadId) {
    selectedThreadId.value = ''
  }
}
</script>
```

### Integration with AiChat Component

```vue
<template>
  <div class="chat-interface">
    <ThreadsList
      v-if="!selectedThreadId"
      integration="customer-support-integration"
      @select-thread="selectThread"
      @create-thread="handleNewThread"
    />
    <AiChat
      v-else
      :thread-id="selectedThreadId"
      url="/api/ai/customer-support-integration/chat-completion/[threadId]"
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

function handleNewThread(thread) {
  if (thread) {
    selectedThreadId.value = thread._id
  }
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'Threads'` | Header title displayed above the threads list |
| `show-header` | `boolean` | `true` | Whether to show the header with title and create button |
| `allow-create` | `boolean` | `true` | Whether to show the "Create New Thread" button |
| `allow-delete` | `boolean` | `true` | Whether to show delete buttons on thread cards |
| `integration` | `string` | `undefined` | Integration ID to filter threads by (optional) |
| `limit` | `number` | `20` | Number of threads to load |
| `auto-load` | `boolean` | `true` | Whether to automatically load threads on component mount |
| `selected` (v-model) | `string` | `''` | The ID of the currently selected thread. Use `v-model:selected` to bind to this value. |

## Slots

### Header Slot

You can customize the header section using the `header` slot. This slot provides access to the title and `createThread` function, allowing you to create a completely custom header layout.

```vue
<template>
  <ThreadsList integration="customer-support" :show-header="false">
    <template #header="{ title, createThread }">
      <div class="custom-header">
        <el-icon class="header-icon"><ChatDotRound /></el-icon>
        <h2>{{ title }}</h2>
        <el-button 
          type="success" 
          :icon="Plus"
          @click="createThread"
          class="custom-create-btn"
        >
          Start New Conversation
        </el-button>
      </div>
    </template>
  </ThreadsList>
</template>

<script setup lang="ts">
import { ChatDotRound, Plus } from '@element-plus/icons-vue'
</script>

<style scoped>
.custom-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 16px;
}

.header-icon {
  font-size: 24px;
}

.custom-create-btn {
  margin-left: auto;
}
</style>
```

**Slot Props:**
- `title`: `string` - The title prop value passed to the component
- `createThread`: `() => Promise<void>` - Function to create a new thread

**Note:** When using the header slot, you may want to set `:show-header="false"` to hide the default header.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `create-thread` | `thread?: IThread` | Emitted when the "Create New Thread" button is clicked. Includes the created thread if integration is provided. |
| `select-thread` | `thread: IThread` | Emitted when a thread card is clicked |
| `thread-deleted` | `threadId: string` | Emitted after a thread is successfully deleted |

## SDK Integration

The component uses the Qelos AI SDK for thread operations:

```typescript
// List threads
const threads = await sdk.ai.threads.list({
  integration: 'integration-id',
  limit: 20,
  sort: '-updated'
});

// Create thread
const thread = await sdk.ai.threads.create({
  integration: 'integration-id',
  title: 'New Thread'
});

// Delete thread
await sdk.ai.threads.delete('thread-id');
```

## Styling

The component uses scoped CSS with Element Plus design tokens:

### CSS Custom Properties

You can customize the appearance using CSS variables:

```css
.threads-list {
  --threads-grid-min-width: 300px;
  --threads-gap: 16px;
}
```

### Component Structure

```html
<div class="threads-list">
  <div class="threads-list-header">
    <h3>{{ title }}</h3>
    <el-button class="create-thread-btn">Create New Thread</el-button>
  </div>
  
  <div class="threads-content">
    <div class="threads-grid">
      <!-- Thread cards -->
    </div>
  </div>
</div>
```

### CSS Classes for Custom Styling

The component exposes specific CSS classes that you can target from outside the component:

#### `.create-thread-btn`

This class is applied to the "Create New Thread" button in the default header. You can use it to customize the button's appearance:

```css
/* Global styles in your main CSS file */
.threads-list .create-thread-btn {
  background: linear-gradient(45deg, #ff6b6b, #ee5a24);
  border: none;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(238, 90, 36, 0.3);
}

.threads-list .create-thread-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(238, 90, 36, 0.4);
}
```

#### `.threads-list-header`

This class is applied to the default header container when not using the header slot:

```css
.threads-list .threads-list-header {
  background: #f8f9fa;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  margin-bottom: 20px;
}
```

## Advanced Usage

### Programmatic Control

```vue
<template>
  <div>
    <ThreadsList ref="threadsListRef" />
    <el-button @click="refreshThreads">Refresh</el-button>
    <el-button @click="loadCustomPage">Load Page 2</el-button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ThreadsList from '@/modules/pre-designed/components/ThreadsList.vue'

const threadsListRef = ref()

function refreshThreads() {
  threadsListRef.value?.refresh()
}

async function loadCustomPage() {
  // Access internal loadThreads method
  await threadsListRef.value?.loadThreads()
}
</script>
```

### Custom Integration Filtering

```vue
<template>
  <ThreadsList
    integration="customer-support-integration"
    :limit="10"
    :allow-create="false"
    title="Customer Support History"
    @select-thread="viewThread"
  />
</template>
```

### Conditional Header

```vue
<template>
  <ThreadsList
    :show-header="isAdmin"
    :allow-create="isAdmin"
    :allow-delete="isAdmin"
    integration="user-integration"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const isAdmin = computed(() => userRole.value === 'admin')
</script>
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
  role: string;
  content: string;
  timestamp?: Date;
  tool_calls?: any[];
  name?: string;
  tool_call_id?: string;
  function_call?: any;
  message_id?: string;
}
```

## Accessibility

The component follows accessibility best practices:

- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly labels
- ARIA attributes where appropriate
- Focus management for interactive elements

## Performance Considerations

- **Lazy Loading**: Threads are loaded on demand with pagination
- **Efficient Rendering**: Uses Vue's reactivity system for optimal updates
- **Memory Management**: Proper cleanup of API calls and event listeners
- **Responsive Images**: Thread previews are truncated to prevent layout shifts

## Troubleshooting

### Common Issues

1. **Threads not loading**: Check that the integration ID is correct and the user has permissions
2. **Empty state showing**: Verify that threads exist for the given integration
3. **Delete not working**: Ensure the user has delete permissions for the integration

### Debug Mode

Enable debug logging to troubleshoot issues:

```vue
<script setup lang="ts">
// Check browser console for detailed logs
</script>
```

## Related Components

- [AiChat](./ai-chat.md) - AI chat interface component
- [QuickTable](./quick-table.md) - Data table component
- [FormInput](./form-input.md) - Form input component

## API Reference

### Exposed Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `loadThreads` | `page?: number` | `Promise<void>` | Loads threads from the API |
| `refresh` | - | `Promise<void>` | Refreshes the current thread list |

### Dependencies

- Vue 3 Composition API
- Element Plus UI components
- Qelos AI SDK
- TypeScript for type safety
