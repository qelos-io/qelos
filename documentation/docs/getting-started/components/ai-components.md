# AI Components

Qelos provides powerful AI components that you can integrate into your applications to add intelligent capabilities.

## 🤖 ai-chat

A fully-featured AI chat interface with streaming support, thread management, and tool execution.

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'

const threadId = ref('thread-123')
const messages = ref([])
</script>

<template>
  <ai-chat
    :thread-id="threadId"
    placeholder="Ask me anything..."
    @message-sent="messages.push($event)"
  />
</template>
```

### With Custom Tools

```vue
<script setup>
import { ref } from 'vue'

const aiTools = [
  {
    name: 'search_products',
    description: 'Search for products in the database',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', description: 'Product category' }
      },
      required: ['query']
    },
    handler: async (args, messageRef) => {
      // Custom handler logic
      const results = await searchProducts(args.query, args.category)
      return `Found ${results.length} products matching your query.`
    }
  },
  {
    name: 'create_order',
    description: 'Create a new order',
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'string' },
        quantity: { type: 'number' }
      }
    },
    handler: async (args) => {
      const order = await createOrder(args)
      return `Order #${order.id} created successfully!`
    }
  }
]
</script>

<template>
  <ai-chat
    :tools="aiTools"
    :thread-id="threadId"
    @thread-created="handleThreadCreated"
    @thread-updated="handleThreadUpdated"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `threadId` | `string` | - | Existing thread ID to continue conversation |
| `tools` | `Array` | `[]` | Array of client tools for AI to use |
| `placeholder` | `string` | `'Type a message...'` | Input placeholder text |
| `disabled` | `boolean` | `false` | Disable the chat interface |
| `show-thread-list` | `boolean` | `false` | Show thread history sidebar |
| `manager` | `boolean` | `false` | Enable manager mode features |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message-sent` | `message` | When a message is sent |
| `thread-created` | `thread` | When a new thread is created |
| `thread-updated` | `thread` | When thread metadata changes |
| `error` | `error` | When an error occurs |

### Thread Management

```vue
<script setup>
import { ref, watch } from 'vue'

const currentThreadId = ref(null)
const threads = ref([])

const createNewThread = async () => {
  const thread = await sdk.ai.createThread()
  currentThreadId.value = thread._id
  threads.value.push(thread)
}

const loadThread = async (threadId) => {
  currentThreadId.value = threadId
}
</script>

<template>
  <div class="chat-container">
    <!-- Thread selector -->
    <div class="thread-list">
      <el-button @click="createNewThread">New Chat</el-button>
      <el-button
        v-for="thread in threads"
        :key="thread._id"
        :type="currentThreadId === thread._id ? 'primary' : 'default'"
        @click="loadThread(thread._id)"
      >
        {{ thread.title || 'Untitled' }}
      </el-button>
    </div>
    
    <!-- Chat interface -->
    <ai-chat :thread-id="currentThreadId" />
  </div>
</template>
```

## 🧠 ai-form-assist

AI-powered form completion and validation helper that enhances user input with intelligent suggestions.

### Basic Usage

```vue
<script setup>
import { ref } from 'vue'

const formData = ref({
  title: '',
  description: '',
  category: ''
})

const blueprintName = 'Product'
</script>

<template>
  <form>
    <form-input v-model="formData.title" label="Product Name" />
    
    <ai-form-assist
      v-model="formData.description"
      :blueprint="blueprintName"
      field="description"
      placeholder="AI can help you write a better description..."
      label="Product Description"
    />
    
    <form-select v-model="formData.category" label="Category">
      <!-- Options -->
    </form-select>
  </form>
</template>
```

### Advanced Configuration

```vue
<script setup>
import { ref } from 'vue'

const content = ref('')

const assistConfig = {
  blueprint: 'BlogPost',
  field: 'content',
  context: {
    tone: 'professional',
    audience: 'developers',
    length: 'medium'
  },
  suggestions: [
    'Write an introduction',
    'Add examples',
    'Summarize key points'
  ],
  onSuggestion: (suggestion) => {
    console.log('Suggestion selected:', suggestion)
  }
}
</script>

<template>
  <ai-form-assist
    v-model="content"
    v-bind="assistConfig"
    :auto-suggest="true"
    :max-suggestions="5"
  />
</template>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | - | Form field value |
| `blueprint` | `string` | - | Blueprint name for context |
| `field` | `string` | - | Field name within blueprint |
| `placeholder` | `string` | - | Input placeholder |
| `auto-suggest` | `boolean` | `false` | Show automatic suggestions |
| `max-suggestions` | `number` | `3` | Maximum suggestions to show |
| `context` | `object` | `{}` | Additional context for AI |

### Best Practices

1. **Provide Clear Context**: Always specify the blueprint and field for better suggestions
2. **Set Appropriate Tone**: Use the context prop to guide the AI's writing style
3. **Validate Input**: Always validate AI-generated content before saving
4. **User Control**: Allow users to accept, reject, or modify suggestions

```vue
<script setup>
import { ref, watch } from 'vue'

const value = ref('')
const isProcessing = ref(false)
const lastSuggestion = ref('')

const handleSuggestion = async (suggestion) => {
  isProcessing.value = true
  try {
    // Validate or process the suggestion
    const processed = await validateContent(suggestion)
    value.value = processed
    lastSuggestion.value = suggestion
  } finally {
    isProcessing.value = false
  }
}

const validateContent = async (content) => {
  // Your validation logic
  return content.trim()
}
</script>

<template>
  <div class="form-assist-container">
    <ai-form-assist
      v-model="value"
      :loading="isProcessing"
      @suggestion="handleSuggestion"
    />
    
    <div v-if="lastSuggestion" class="suggestion-history">
      Last suggestion: {{ lastSuggestion }}
    </div>
  </div>
</template>
```

## 🎯 Integration Examples

### Customer Support Bot

```vue
<script setup>
import { ref } from 'vue'

const supportTools = [
  {
    name: 'search_knowledge_base',
    description: 'Search the knowledge base for answers',
    handler: async (args) => {
      const results = await searchKB(args.query)
      return formatKBResults(results)
    }
  },
  {
    name: 'create_ticket',
    description: 'Create a support ticket',
    handler: async (args) => {
      const ticket = await createTicket(args)
      return `Ticket #${ticket.id} created. We'll respond within 24 hours.`
    }
  },
  {
    name: 'check_order_status',
    description: 'Check the status of an order',
    handler: async (args) => {
      const status = await getOrderStatus(args.orderId)
      return `Order ${args.orderId} is ${status}`
    }
  }
]
</script>

<template>
  <ai-chat
    :tools="supportTools"
    placeholder="How can I help you today?"
    welcome-message="Hello! I'm your virtual assistant. How can I assist you?"
  />
</template>
```

### Code Assistant

```vue
<script setup>
import { ref } from 'vue'

const codeTools = [
  {
    name: 'generate_code',
    description: 'Generate code based on requirements',
    schema: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['javascript', 'python', 'java'] },
        requirements: { type: 'string' }
      }
    },
    handler: async (args) => {
      const code = await generateCode(args)
      return { type: 'code', language: args.language, code }
    }
  },
  {
    name: 'explain_code',
    description: 'Explain what a code snippet does',
    handler: async (args) => {
      const explanation = await explainCode(args.code)
      return explanation
    }
  }
]

const handleCodeResponse = (response) => {
  if (response.type === 'code') {
    // Handle code response with syntax highlighting
    showCodeEditor(response.code, response.language)
  }
}
</script>

<template>
  <ai-chat
    :tools="codeTools"
    @message-received="handleCodeResponse"
  >
    <template #message="{ message }">
      <div v-if="message.type === 'code'" class="code-message">
        <monaco-editor
          :value="message.code"
          :language="message.language"
          :read-only="true"
          :height="Math.min(message.code.split('\n').length * 20, 400)"
        />
      </div>
      <div v-else v-html="message.content" />
    </template>
  </ai-chat>
</template>
```

## 🔧 Configuration

### AI Provider Setup

```typescript
// config/ai.ts
export const aiConfig = {
  defaultProvider: 'openai',
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-sonnet',
      temperature: 0.7,
      maxTokens: 2000
    }
  },
  features: {
    streaming: true,
    tools: true,
    threads: true,
    memory: true
  }
}
```

### Custom Tool Template

```typescript
// utils/ai-tools.ts
export function createTool(config) {
  return {
    name: config.name,
    description: config.description,
    schema: {
      type: 'object',
      properties: config.properties || {},
      required: config.required || []
    },
    handler: async (args, messageRef) => {
      try {
        // Pre-processing
        if (config.preProcess) {
          await config.preProcess(args)
        }
        
        // Main logic
        const result = await config.handler(args, messageRef)
        
        // Post-processing
        if (config.postProcess) {
          return await config.postProcess(result)
        }
        
        return result
      } catch (error) {
        console.error(`Tool ${config.name} error:`, error)
        return `Error: ${error.message}`
      }
    }
  }
}

// Usage
export const searchTool = createTool({
  name: 'search_products',
  description: 'Search products',
  properties: {
    query: { type: 'string' },
    category: { type: 'string' }
  },
  handler: async (args) => {
    return await productSearch(args.query, args.category)
  }
})
```

## 📚 Next Steps

- [Chat Completion API](/sdk/ai_operations) - Learn about the underlying API
- [AI Components Guide](/getting-started/components/ai-components) - More AI component examples
- [Error Handling](/getting-started/components/feedback-components) - Handle errors gracefully
