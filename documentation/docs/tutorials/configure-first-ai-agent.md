---
title: Configure Your First AI Agent and Use It
editLink: true
---

# Configure Your First AI Agent and Use It

In this tutorial you will:

1. Turn an OpenAI integration into a purpose-built AI agent with its own persona and instructions
2. Chat with it through the Qelos UI
3. Chat with it from the terminal using the CLI
4. Call it programmatically using the SDK

**Estimated time:** 20 minutes

---

## Prerequisites

- A Qelos instance — either sign up at [app.qelos.io](https://app.qelos.io) for a managed cloud instance, or run it locally by following the [Installation Guide](/getting-started/installation).
- An OpenAI connection already set up in your workspace. If not, complete the [previous tutorial](/tutorials/create-app-openai-token) first.
- The Qelos CLI configured — see [Step 3 of the previous tutorial](/tutorials/create-app-openai-token#step-3-pull-your-config-locally-optional) for the `.env` setup.
- `@qelos/sdk` installed in a Node.js project if you want to follow the SDK section.

---

## Step 1 — Edit the Integration's System Prompt

The system prompt defines your agent's personality, knowledge boundaries, and instructions.

1. Go to **Settings → AI Integrations** and open the integration you created earlier.
2. In the **System Prompt** field, enter something like:

   ```
   You are a helpful assistant for a SaaS product team.
   You answer questions about software architecture, product design, and best practices.
   Keep answers concise and practical. If you do not know something, say so.
   ```

3. Set a **Name** that you will use to reference the agent: `product-assistant`
4. Optionally set a **Temperature** (0.0–1.0). Lower values produce more predictable answers; higher values are more creative.
5. Click **Save**.

---

## Step 2 — Chat with the Agent in the UI

Qelos provides a built-in chat interface for every AI integration.

1. In the integration detail page, click **Open Chat** (or navigate to the **Chat** tab).
2. Type a message and press Enter.
3. You should see a response streamed back in real time.

The UI stores conversation history in **threads**. You can create multiple threads for different topics and switch between them.

---

## Step 3 — Chat from the Terminal (CLI)

The `qelos agent` command lets you send messages to any integration by name.

### One-off message

```bash
qelos agent product-assistant --message "What are the trade-offs between monolithic and microservice architectures?"
```

### Streaming mode (responses appear word by word)

```bash
qelos agent product-assistant --stream --message "Explain event-driven architecture in simple terms"
```

### Keep a conversation going with a log file

```bash
# First message — starts the conversation
echo "My team is migrating from a monolith to microservices" | \
  qelos agent product-assistant --log ./chat.json

# Follow-up — previous context is sent automatically
echo "What should we tackle first?" | \
  qelos agent product-assistant --log ./chat.json
```

### Save your preferred options

```bash
# Run once with --save to avoid repeating flags every time
qelos agent product-assistant --stream --log ./logs/product-assistant.json --save

# From now on this is equivalent to the command above
qelos agent product-assistant --message "Hello"
```

See the full [CLI Agent reference](/cli/agent) for all options.

---

## Step 4 — Call the Agent from Code (SDK)

### Install the SDK

```bash
npm install @qelos/sdk
```

### Initialize and authenticate

```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
  appUrl: 'https://your-qelos-instance.com',
  fetch: globalThis.fetch,
  forceRefresh: true,
});

await sdk.authentication.oAuthSignin({
  username: 'your@email.com',
  password: 'yourpassword',
});
```

### Send a single message (no thread)

```typescript
const INTEGRATION_ID = 'your-integration-id'; // copy from the UI

const response = await sdk.ai.chat.chat(INTEGRATION_ID, {
  messages: [
    { role: 'user', content: 'What is the strangler fig pattern?' }
  ],
  temperature: 0.5,
});

console.log(response.choices[0].message.content);
```

### Maintain a multi-turn conversation with threads

```typescript
// Create a thread to persist conversation context
const thread = await sdk.ai.threads.create({
  integration: INTEGRATION_ID,
  title: 'Architecture deep-dive',
});

// First turn
const reply1 = await sdk.ai.chat.chatInThread(INTEGRATION_ID, thread._id!, {
  messages: [{ role: 'user', content: 'We are planning a migration from Rails to Node.js.' }],
});
console.log('Assistant:', reply1.choices[0].message.content);

// Second turn — the thread already contains the previous messages
const reply2 = await sdk.ai.chat.chatInThread(INTEGRATION_ID, thread._id!, {
  messages: [{ role: 'user', content: 'What migration risks should we be aware of?' }],
});
console.log('Assistant:', reply2.choices[0].message.content);
```

### Stream a response

```typescript
const stream = await sdk.ai.chat.streamChatInThread(INTEGRATION_ID, thread._id!, {
  messages: [{ role: 'user', content: 'Give me a step-by-step migration plan.' }],
});

for await (const chunk of sdk.ai.chat.parseSSEStream(stream)) {
  if (chunk.choices?.[0]?.delta?.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
```

---

## What's Next?

- [AI Operations SDK reference](/sdk/ai_operations) — full API surface for threads, chat, and RAG.
- [Build an Agentic Todo Machine](/tutorials/agentic-todo-machine) — put everything together in an autonomous, polling-based workflow.
- [AI Chat Component](/pre-designed-frontends/components/ai-chat) — drop a pre-built chat UI into your plugin page.
