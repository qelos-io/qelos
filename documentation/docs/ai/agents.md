---
title: AI Agents — Creation & Embedding Guide
editLink: true
---

# AI Agents — Creation & Embedding Guide

This guide walks you through the full lifecycle of an AI agent in Qelos: creating it in the admin UI, configuring its system prompt, model, and tools, testing it inside the admin chat panel, and embedding it in any external app via the SDK or a script-tag widget. It also covers client-side function execution and uploading content to the agent's RAG knowledge base.

> **What is an "agent" in Qelos?** An agent is an AI **integration** built on top of an AI **source** (the connection to a provider — OpenAI, Anthropic, Gemini, etc.). The source holds the API credentials and provider defaults; the integration holds the agent's behavior — its system prompt, tools, RAG configuration, and per-agent model overrides.

---

## 1. Create an AI source (provider connection)

Before you can create an agent, you need an AI source — the credential record for the provider.

1. Sign in to your Qelos admin and open **Integrations → Sources** (route: `/integrations/openai/sources`, `/integrations/claude-ai/sources`, or `/integrations/gemini/sources` depending on the provider).
2. Click **Create new source**.
3. Fill in:

   | Field | Description |
   |---|---|
   | `name` | A label for this connection (e.g. `OpenAI — Production`). |
   | `labels` | Optional tags for filtering. |
   | `authentication.token` | Your provider API key. Stored encrypted. |
   | `metadata.defaultModel` | The model used when an agent does not override it (e.g. `gpt-4.1-mini`, `claude-sonnet-4-5`, `gemini-1.5-pro`). |
   | `metadata.apiUrl` | Optional custom base URL (proxies, Azure-style endpoints). |
   | `metadata.organizationId` | Optional — OpenAI-only. |
   | `metadata.defaultTemperature` / `defaultTopP` / `defaultMaxTokens` / `defaultFrequencyPenalty` / `defaultPresencePenalty` | Provider-level defaults. Per-agent and per-call overrides take precedence. |

4. Save. The source ID is the value you'll pass to the SDK and embed code.

You can manage sources programmatically with the administrator SDK:

```typescript
import { QelosAdministratorSDK } from '@qelos/sdk/dist/administrator';

const admin = new QelosAdministratorSDK({ appUrl, fetch });

const source = await admin.integrationSources.create({
  name: 'OpenAI — Production',
  labels: ['ai', 'prod'],
  metadata: { defaultModel: 'gpt-4.1-mini' },
  authentication: { token: process.env.OPENAI_API_KEY }
});
```

---

## 2. Create an agent (integration)

In the admin, open **Integrations → AI Agents** and click **Create**. The agent form (`AIAgentForm.vue`) walks you through:

| Field | Purpose |
|---|---|
| **Name** | The agent's display name. |
| **Description** | Free-text explanation of what the agent does. Helps humans, not the model. |
| **Source** | The provider connection from step 1. |
| **System prompt** (`instructions`) | The agent's personality, scope, and behavior rules. This is the most load-bearing field — invest time here. |
| **Model** | Optional per-agent override of the source's `defaultModel`. |
| **Record thread** | If `true`, every conversation is persisted as a thread in MongoDB and can be resumed by ID. |
| **Vector store** | Enable RAG for this agent. See [§8 RAG](#8-upload-knowledge-base-content-rag). |
| **Vector store scope** | `tenant`, `workspace`, `user`, or `thread` — controls who shares the knowledge base. |
| **Tools** | JSON Schema function definitions the model can call. See [§3 Tools](#3-configure-tools-functions). |

Save the agent. The integration ID is what you'll pass to `sdk.ai.chat.chat(agentId, …)`.

### Writing a good system prompt

A few rules that hold up well:

- **State the role and the boundaries.** "You are a billing assistant for Acme. Answer questions about invoices and subscriptions. Refuse anything else and route the user to support."
- **Tell it what data it has access to.** If the agent has tools, name them and explain when to use each.
- **Tell it the output format.** Markdown tables, short bullet lists, or plain prose — be explicit.
- **Give one or two examples.** Short few-shot examples beat lengthy abstract instructions.

---

## 3. Configure tools (functions)

Tools let the model call your code (server-side) or the user's browser (client-side) instead of just generating text. Each tool is a JSON Schema describing its `name`, `description`, and `parameters`.

In the admin, the **Functions / Tools** section uses `FunctionParametersSchemaEditor.vue` — a dual-mode editor with a visual form and a Monaco-powered raw-JSON view. They stay in sync.

A typical tool definition looks like:

```json
{
  "name": "get_order_status",
  "description": "Look up the status of a customer order by its ID.",
  "parameters": {
    "type": "object",
    "properties": {
      "orderId": {
        "type": "string",
        "description": "The order ID, e.g. ORD-1234."
      }
    },
    "required": ["orderId"]
  }
}
```

Two execution modes:

- **Server-side tools** are configured on the integration and run inside Qelos when the model calls them. Use these for anything that needs credentials, database access, or workspace data.
- **Client-side tools** (`clientTools` on the chat call) run in the user's browser. Use these for anything local to the user — geolocation, clipboard, opening modals, navigating the app. See [§7 Client tools](#7-client-tools-local-function-execution).

> **Description quality determines tool quality.** The model decides whether to call a tool by reading its `description` and the parameter descriptions. Vague descriptions cause skipped or misused tools.

---

## 4. Test the agent in the admin chat panel

Every agent has a built-in test panel. Open the agent in the admin and click **Open chat** — this mounts the `<AiChat>` component (`apps/admin/src/modules/pre-designed/components/AiChat.vue`) wired to your agent's integration ID.

What you can do here:

- Send messages and watch the streamed response.
- Trigger any configured tool and see its arguments and return value.
- Toggle thread recording to test with and without conversation memory.
- Drop `.txt`, `.csv`, `.json`, or `.md` files directly into the chat to send them as message content.

Iterate on the system prompt and tool descriptions in this panel before you embed the agent.

---

## 5. Embed via the SDK in your app

Once the agent works in the test panel, embed it into any app using `@qelos/sdk`. The simplest call:

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-instance.com',
  fetch: globalThis.fetch
});

await sdk.authentication.oAuthSignin({ username, password });

const reply = await sdk.ai.chat.chat('agent-id', {
  messages: [{ role: 'user', content: 'What are your business hours?' }]
});

console.log(reply.choices[0].message.content);
```

### Streaming responses

For real-time UIs, stream the response:

```typescript
const stream = await sdk.ai.chat.stream('agent-id', {
  messages: [{ role: 'user', content: 'Walk me through onboarding.' }]
});

for await (const chunk of sdk.ai.chat.parseSSEStream(stream)) {
  if (chunk.type === 'chunk' && chunk.content) {
    process.stdout.write(chunk.content);
  }
}
```

### Conversations with memory

Create a thread once, then reuse the thread ID across calls. The agent receives full conversation history without you having to send it.

```typescript
const thread = await sdk.ai.threads.create({ integration: 'agent-id' });

await sdk.ai.chat.chatInThread('agent-id', thread._id!, {
  messages: [{ role: 'user', content: 'Hi, my name is Alex.' }]
});

await sdk.ai.chat.chatInThread('agent-id', thread._id!, {
  messages: [{ role: 'user', content: 'What did I just say my name was?' }]
});
// → "Your name is Alex."
```

For full thread/RAG/streaming reference, see [AI Operations](../sdk/ai_operations.md).

---

## 6. Embed via widget (script tag)

> **Status:** the embeddable web widget is on the roadmap as part of `@qelos/web-sdk`. The pattern below is the target API; until the widget ships, embed via the SDK directly (§5) or by mounting `<AiChat>` inside a Vue micro-frontend.

The planned widget is a single script tag that mounts a chat panel anywhere on a page:

```html
<!-- target: planned @qelos/web-sdk widget -->
<script
  src="https://your-qelos-instance.com/web-sdk/chat.js"
  data-agent-id="agent-id"
  data-app-url="https://your-qelos-instance.com"
  data-position="bottom-right"
  data-title="Need help?"
  defer
></script>
```

Programmatic mount (for SPAs that need to control lifecycle):

```html
<script type="module">
  import { mountChat } from 'https://your-qelos-instance.com/web-sdk/chat.js';

  const widget = mountChat({
    agentId: 'agent-id',
    appUrl: 'https://your-qelos-instance.com',
    container: '#my-chat',
    recordThread: true,
    suggestions: [
      'How do I reset my password?',
      'Show me my recent orders'
    ]
  });

  // Later:
  widget.open();
  widget.close();
  widget.destroy();
</script>
```

### Until the widget ships: iframe embed

You can already embed any agent today using the admin's standalone chat route inside an iframe:

```html
<iframe
  src="https://your-qelos-instance.com/embed/ai-chat?agentId=agent-id&recordThread=true"
  style="border:0;width:100%;height:600px"
  allow="clipboard-write"
></iframe>
```

The iframe inherits the visitor's Qelos session cookie. For anonymous use, generate a scoped guest token server-side and pass it as a `token` query parameter.

---

## 7. Client tools (local function execution)

Client tools are functions the model can invoke that run **in the user's browser** instead of on the server. The SDK ships them on each chat call via the `clientTools` option, and the chat handler intercepts the model's tool call, runs your handler, and returns the result back to the model — all without a round-trip to your backend.

Use them for anything local: geolocation, clipboard, opening a modal, scrolling to an element, reading a `localStorage` value, redirecting after a confirmation.

```typescript
const reply = await sdk.ai.chat.chat('agent-id', {
  messages: [{ role: 'user', content: 'Where am I right now?' }],
  clientTools: [
    {
      name: 'get_current_location',
      description: "Get the user's current geographic coordinates.",
      schema: {
        type: 'object',
        properties: {
          accuracy: { type: 'string', enum: ['high', 'low'] }
        }
      }
    }
  ]
});
```

> **Note:** `sdk.ai.chat.chat()` advertises the tools to the model. The actual handler runs inside the chat UI — see `<AiChat>`'s `tools` prop, which accepts the same shape plus a `handler(args, chatMessage)` function. If you're calling `sdk.ai.chat.chat()` directly without `<AiChat>`, you'll get the model's tool-call back in the response and execute the handler yourself, then re-call `chat()` with the tool result appended to `messages`.

The Qelos `<AiChat>` component (used both in admin and in any pre-designed frontend) handles the call/result loop for you. Pass tools with handlers:

```vue
<ai-chat
  :integration-id="agentId"
  :tools="[
    {
      name: 'copy_to_clipboard',
      description: 'Copy text to the user clipboard.',
      schema: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text']
      },
      handler: async (args) => {
        await navigator.clipboard.writeText(args.text);
        return 'Copied.';
      }
    }
  ]"
></ai-chat>
```

A built-in set of interactive UI tools (`confirm`, `select`, `multi_select`, `form`, `date`, `time`, `datetime`, `number`) is also available via `<ai-chat allow-tools="…">` — see the [AiChat component reference](../pre-designed-frontends/components/ai-chat.md#predefined-interactive-tools) for the full list.

### Handler contract

```typescript
type ClientToolHandler = (
  args: Record<string, any>,        // parsed JSON arguments from the model
  chatMessage: Ref<ChatMessage>     // reactive ref to the assistant message that triggered the call
) => string | object | Promise<string | object>;
```

- Return a string or object — objects are JSON-stringified before being sent back to the model.
- Return an empty string to **skip** the follow-up call (useful when the tool's effect is purely side-effectful, e.g. closing a modal).
- Throw to surface an error to the model so it can retry or apologize.

---

## 8. Upload knowledge base content (RAG)

Retrieval-Augmented Generation lets your agent answer from your content — docs, FAQs, internal wikis — without you stuffing it all into the system prompt. Qelos manages the vector store, embedding, and retrieval automatically; you upload content and the agent retrieves the relevant chunks at chat time.

### Enable RAG on the agent

In the admin, open the agent and:

1. Toggle **Enable vector store**.
2. Choose the **scope**:
   - `tenant` — one shared knowledge base for everyone in the tenant.
   - `workspace` — per-workspace knowledge bases (multi-tenant SaaS).
   - `user` — personal knowledge bases (Notion-style assistants).
   - `thread` — short-lived per-conversation context.
3. Optionally set an **expiration** (in days) for thread-scoped stores.

### Upload content via SDK

```typescript
// Upload plain text
await sdk.ai.rag.uploadContent('source-id', {
  integrationId: 'agent-id',
  content: 'Acme returns policy: items can be returned within 30 days...',
  fileName: 'returns-policy.txt',
  metadata: { category: 'policy', version: '2026-Q1' }
});

// Upload structured data (auto-stringified)
await sdk.ai.rag.uploadContent('source-id', {
  integrationId: 'agent-id',
  content: {
    title: 'Pricing tiers',
    tiers: [
      { name: 'Basic', price: 10 },
      { name: 'Pro',   price: 25 }
    ]
  },
  fileName: 'pricing.json'
});
```

### Manage stored files

```typescript
// Remove specific files (e.g. when a doc is updated)
await sdk.ai.rag.clearStorage('source-id', {
  integrationId: 'agent-id',
  fileIds: ['file-id-1', 'file-id-2']
});

// Wipe the whole store
await sdk.ai.rag.clearStorage('source-id', {
  integrationId: 'agent-id'
});
```

### Tips

- **Chunk size matters less than chunk meaning.** One file per topic beats one file per page. Split a long document at section boundaries before uploading.
- **Use `metadata` for filters.** Tag content with `language`, `version`, `audience` and the model retrieves more relevant chunks.
- **Re-upload on change.** RAG stores are not auto-synced with the source-of-truth. Wire a job that re-uploads when your docs change, or call `clearStorage` first to avoid duplicates.

---

## Related documentation

- [AI Operations](../sdk/ai_operations.md) — full SDK reference for threads, chat, and RAG.
- [AiChat Component](../pre-designed-frontends/components/ai-chat.md) — the Vue chat component, props, slots, and tool handlers.
- [AI Token Usage Tracking](./token-usage-tracking.md) — observability for spend and usage per agent.

---

© Velocitech LTD. All rights reserved.
