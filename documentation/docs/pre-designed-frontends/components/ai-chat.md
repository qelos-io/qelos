---
title: AI Chat Component
editLink: true
---

# {{ $frontmatter.title }}

## Overview

The `<ai-chat>` component provides a complete AI chat interface with streaming support, file attachments, markdown rendering, and customizable UI. It handles real-time streaming responses, maintains conversation history, and supports thread management.

## Usage

```html
<ai-chat 
  url="/api/ai/your-integration-id/chat"
  title="AI Assistant"
></ai-chat>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | String | **Required** | API endpoint for chat completion. Use `[threadId]` placeholder for thread-based conversations |
| `title` | String | "🤖 I'm your AI assistant" | Title displayed in the initial message |
| `text` | String | '' | Pre-populate the input field with text |
| `chatContext` | Object | {} | Additional context to send with each message |
| `recordThread` | Boolean | false | Whether to create and maintain a conversation thread |
| `threadId` | String | undefined | Existing thread ID to continue a conversation |
| `integrationId` | String | undefined | AI integration ID (auto-extracted from URL if not provided) |
| `suggestions` | Array | [] | Array of suggestion strings or objects to display initially |
| `fullScreen` | Boolean | false | Whether to display in full-screen mode |
| `typingText` | String | "AI is typing..." | Custom text to show while AI is responding |

## Events

| Event | Parameters | Description |
|-------|------------|-------------|
| `thread-created` | (thread: Object) | Emitted when a new thread is created |
| `thread-updated` | (thread: Object) | Emitted when thread is updated |
| `message-sent` | (message: Object) | Emitted when user sends a message |
| `message-received` | (message: Object) | Emitted when AI responds |
| `function-executed` | (data: Object) | Emitted when AI executes a function call |
| `update:threadId` | (threadId: String) | Emitted when thread ID changes (for v-model) |
| `mounted` | ({ input, messages, threadId, chatWindow, inputRef, loading, chatCompletionUrl, createThread, addMessage, send, renderMarkdown, openFilePicker }: Object) | Fired once the component mounts to expose internals for advanced integrations |

**Mounted payload reference**

- `input`: `Ref<string>` bound to the textarea value
- `messages`: `Reactive<ChatMessage[]>` with the entire conversation log
- `threadId`: `Ref<string | undefined>` that syncs with `v-model:thread-id`
- `chatWindow`: `Ref<HTMLElement | undefined>` pointing to the scrollable container
- `inputRef`: `Ref<InstanceType<typeof ElInput> | undefined>` for focusing the textarea
- `loading`: `Ref<boolean>` indicating when the assistant is streaming
- `chatCompletionUrl`: `ComputedRef<string>` that resolves the active endpoint (including thread ids)
- `createThread`: `() => Promise<Thread>` helper to lazily create a thread
- `addMessage`: `(message: ChatMessageInput) => void` to push custom messages into the log
- `send`: `() => Promise<void>` to trigger the default send routine
- `renderMarkdown`: `(content: string) => string` renderer used by message bubbles
- `openFilePicker`: `() => void` to show the hidden file input

## Slots

### `initialMessage`

Customize the initial message shown when chat is empty.

**Slot Props:**
- `setInput` - Function that mirrors the component's suggestion click handler `(value: string | Suggestion) => void`
- `input` - Reactive ref holding the current textarea value

```html
<ai-chat url="/api/ai/chat">
  <template #initialMessage>
    <div class="custom-welcome">
      <h2>Welcome to Support Chat</h2>
      <p>How can we help you today?</p>
    </div>
  </template>
</ai-chat>
```

### `message`

Customize how each message is rendered. Provides full control over message display.

**Slot Props:**
- `message` - The message object (`{ id, role, content, time, type, filename }`)
- `index` - Message index in the array
- `isStreaming` - Boolean indicating if this message is currently streaming
- `formatTime` - Function to format timestamp: `(date: string | Date) => string`
- `copyMessage` - Function to copy message: `(msg: ChatMessage) => void`
- `renderMarkdown` - Function to render markdown: `(content: string) => string`
- `fileIconClass` - Function to get file icon: `(filename: string) => string`
- `copiedMessageId` - ID of currently copied message (for UI feedback)
- `loading` - Boolean indicating if AI is responding

```html
<ai-chat url="/api/ai/chat">
  <template #message="{ message, formatTime, copyMessage, renderMarkdown, isStreaming }">
    <div :class="['custom-message', message.role, { streaming: isStreaming }]">
      <div class="message-header">
        <strong>{{ message.role === 'user' ? 'You' : 'AI Assistant' }}</strong>
        <span>{{ formatTime(message.time) }}</span>
      </div>
      <div v-html="renderMarkdown(message.content)" class="message-body"></div>
      <button @click="copyMessage(message)" class="copy-btn">Copy</button>
    </div>
  </template>
</ai-chat>
```

### `user-input`

Customize the input form. Provides full control over how users send messages.

**Slot Props:**
- `send` - Function to send message: `() => void`
- `input` - Current input value (string)
- `updateInput` - Function to update input: `(value: string) => void`
- `loading` - Boolean indicating if AI is responding
- `canSend` - Boolean indicating if sending is allowed
- `attachedFiles` - Array of attached files
- `removeFile` - Function to remove file: `(index: number) => void`
- `inputRef` - Reference to the input element
- `onInputEnter` - Handler for Enter key: `(e: KeyboardEvent) => void`

```html
<ai-chat url="/api/ai/chat">
  <template #user-input="{ send, input, updateInput, loading, canSend }">
    <div class="custom-input-form">
      <textarea 
        :value="input" 
        @input="updateInput($event.target.value)"
        placeholder="Type your message..."
        :disabled="loading"
      ></textarea>
      <button 
        @click="send" 
        :disabled="!canSend || loading"
        class="send-button"
      >
        {{ loading ? 'Sending...' : 'Send' }}
      </button>
    </div>
  </template>
</ai-chat>
```

## Examples

### Basic Chat

```html
<ai-chat 
  url="/api/ai/my-assistant/chat"
  title="Customer Support"
></ai-chat>
```

### Chat with Suggestions

```html
<ai-chat 
  url="/api/ai/my-assistant/chat"
  :suggestions="[
    'How do I reset my password?',
    'What are your pricing plans?',
    'How do I contact support?',
    { label: 'View Documentation', text: 'Show me the documentation', icon: 'book' }
  ]"
></ai-chat>
```

### Chat with Thread Management

```html
<template>
  <ai-chat 
    url="/api/ai/my-assistant/chat/[threadId]"
    v-model:thread-id="currentThreadId"
    :record-thread="true"
    @thread-created="onThreadCreated"
  ></ai-chat>
</template>

<script setup>
import { ref } from 'vue';

const currentThreadId = ref('');

function onThreadCreated(thread) {
  console.log('New thread created:', thread._id);
  // Save thread ID to your database or state
}
</script>
```

### Chat with Context

```html
<template>
  <ai-chat 
    url="/api/ai/my-assistant/chat"
    :chat-context="{
      userId: currentUser.id,
      workspace: currentWorkspace.name,
      plan: currentUser.plan
    }"
  ></ai-chat>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const currentUser = computed(() => userStore.user);
const currentWorkspace = computed(() => userStore.workspace);
</script>
```

### Full-Screen Chat

```html
<ai-chat 
  url="/api/ai/my-assistant/chat"
  :full-screen="true"
  typing-text="Assistant is thinking..."
></ai-chat>
```

### Custom Message Styling

```html
<template>
  <ai-chat url="/api/ai/chat">
    <template #message="{ message, formatTime, renderMarkdown, isStreaming, copyMessage }">
      <div :class="['msg', message.role]">
        <div class="msg-avatar">
          <img v-if="message.role === 'user'" :src="userAvatar" />
          <img v-else src="/ai-avatar.png" />
        </div>
        <div class="msg-content">
          <div class="msg-meta">
            <span class="msg-author">{{ message.role === 'user' ? userName : 'AI' }}</span>
            <span class="msg-time">{{ formatTime(message.time) }}</span>
          </div>
          <div 
            v-html="renderMarkdown(message.content)" 
            :class="{ 'streaming': isStreaming }"
          ></div>
          <button @click="copyMessage(message)" class="msg-copy">
            <el-icon><DocumentCopy /></el-icon>
          </button>
        </div>
      </div>
    </template>
  </ai-chat>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const userName = computed(() => userStore.user.name);
const userAvatar = computed(() => userStore.user.avatar);
</script>

<style scoped>
.msg {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.msg.user {
  flex-direction: row-reverse;
}

.msg-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.msg-content {
  flex: 1;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 12px;
}

.msg.user .msg-content {
  background: #e3f2fd;
}
</style>
```

### Custom Input with Voice Recording

```html
<template>
  <ai-chat url="/api/ai/chat">
    <template #user-input="{ send, input, updateInput, loading, canSend }">
      <div class="voice-input-wrapper">
        <el-input
          :model-value="input"
          @update:model-value="updateInput"
          type="textarea"
          :rows="3"
          placeholder="Type or record your message..."
          :disabled="loading || isRecording"
        ></el-input>
        <div class="input-actions">
          <el-button 
            v-if="!isRecording"
            @click="startRecording" 
            :icon="Microphone"
            circle
          ></el-button>
          <el-button 
            v-else
            @click="stopRecording" 
            :icon="VideoPause"
            type="danger"
            circle
          ></el-button>
          <el-button 
            @click="send" 
            :disabled="!canSend || loading"
            type="primary"
            :loading="loading"
          >
            Send
          </el-button>
        </div>
      </div>
    </template>
  </ai-chat>
</template>

<script setup>
import { ref } from 'vue';
import { Microphone, VideoPause } from '@element-plus/icons-vue';

const isRecording = ref(false);

function startRecording() {
  isRecording.value = true;
  // Implement voice recording logic
}

function stopRecording() {
  isRecording.value = false;
  // Process recorded audio
}
</script>
```

### Handling Function Calls

```html
<template>
  <ai-chat 
    url="/api/ai/my-assistant/chat"
    @function-executed="handleFunctionCall"
  ></ai-chat>
</template>

<script setup>
import { ElNotification } from 'element-plus';

function handleFunctionCall({ name, arguments: args }) {
  console.log('AI executed function:', name, args);
  
  // Handle specific functions
  if (name === 'create_ticket') {
    ElNotification({
      title: 'Ticket Created',
      message: `Ticket #${args.ticketId} has been created`,
      type: 'success'
    });
  }
}
</script>
```

## Features

### Markdown Support
The component automatically renders markdown in messages, including:
- Headers (h1-h6)
- Lists (ordered and unordered)
- Code blocks with syntax highlighting
- Tables with copy functionality
- Links
- Bold, italic, and inline code
- Blockquotes

### File Attachments
Users can attach files by:
- Clicking the attachment button
- Dragging and dropping files into the chat
- Supported formats: `.txt`, `.csv`, `.json`, `.md`

### Streaming Responses
The component supports real-time streaming of AI responses, showing content as it's generated.

### Thread Management
When `recordThread` is enabled, the component automatically:
- Creates a new thread on first message
- Maintains conversation history
- Supports resuming conversations with `threadId`

## Styling

The component uses CSS custom properties for theming:

```css
.ai-chat {
  --body-bg: #fff;
  --border-color: #e3e7ee;
  --border-radius: 18px;
  --text-color: #222;
  --main-color: #409eff;
  --focus-color: #6ebfff;
  --button-bg-color: linear-gradient(135deg, #409eff 65%, #6ebfff 100%);
  --inputs-bg-color: #f7fafd;
}
```

You can override these in your component's styles:

```vue
<style>
.ai-chat {
  --main-color: #10b981;
  --focus-color: #34d399;
  --border-radius: 12px;
}
</style>
```

---

© Velocitech LTD. All rights reserved.
