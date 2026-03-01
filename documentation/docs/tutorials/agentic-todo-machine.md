---
title: Build an Agentic Todo Machine
editLink: true
---

# Build an Agentic Todo Machine

In this tutorial you will build a fully autonomous system made of three parts:

1. **A `todos` blueprint** — the data model that stores tasks and their status.
2. **An AI agent** — given a goal, it generates a list of actionable todos and saves them to the blueprint.
3. **A poller app** — a Node.js script that periodically fetches pending todos, executes each task (by asking the agent what to do), and marks them complete.

By the end you will have an end-to-end agentic loop running entirely inside Qelos.

```
┌──────────────────────────────────────────────────────────────┐
│                       Agentic Loop                           │
│                                                              │
│   User goal  →  AI Agent  →  todos blueprint                 │
│                                  ↑                           │
│                           Poller (Node.js)                   │
│                         reads & executes tasks               │
│                           marks todos done                   │
└──────────────────────────────────────────────────────────────┘
```

**Estimated time:** 45–60 minutes

---

## Prerequisites

- A Qelos instance — either sign up at [app.qelos.io](https://app.qelos.io) for a managed cloud instance, or run it locally by following the [Installation Guide](/getting-started/installation).
- An OpenAI connection configured. Follow the first two tutorials if you have not done so:
  - [Create an App and Add Your OpenAI Token](/tutorials/create-app-openai-token)
  - [Configure Your First AI Agent](/tutorials/configure-first-ai-agent)
- Qelos CLI installed and authenticated.
- Node.js v20+ and `npm`.

---

## Part 1 — Create the Todos Blueprint

A blueprint is a data model. You will create one called `todos` with the fields needed to track a task.

### 1a. Create the Blueprint in the Admin UI

1. Navigate to **Admin → Blueprints → + New Blueprint**.
2. Set the key to `todos` and the name to `Todos`.
3. Add the following fields:

   | Key | Type | Required | Notes |
   |-----|------|----------|-------|
   | `title` | String | Yes | Short description of the task |
   | `description` | Text | No | Detailed instructions for executing the task |
   | `status` | String | Yes | One of: `pending`, `in_progress`, `done`, `failed` |
   | `result` | Text | No | Output produced when the task was executed |
   | `goal` | String | No | The high-level goal this todo belongs to |

4. Click **Save**.

### 1b. (Alternative) Create via the SDK

If you prefer code, use the Admin SDK:

```typescript
import QelosAdminSDK from '@qelos/sdk/administrator';

const sdkAdmin = new QelosAdminSDK({
  appUrl: 'https://your-qelos-instance.com',
  fetch: globalThis.fetch,
});

await sdkAdmin.authentication.oAuthSignin({
  username: 'admin@example.com',
  password: 'yourpassword',
});

await sdkAdmin.manageBlueprints.create({
  key: 'todos',
  name: 'Todos',
  description: 'Agentic task queue',
  fields: [
    { key: 'title',       type: 'string', required: true  },
    { key: 'description', type: 'text',   required: false },
    { key: 'status',      type: 'string', required: true  },
    { key: 'result',      type: 'text',   required: false },
    { key: 'goal',        type: 'string', required: false },
  ],
});

console.log('Blueprint created.');
```

---

## Part 2 — Create the Todo-Generator Agent

This agent receives a high-level goal and responds with a structured list of todos in JSON format.

### 2a. Create the Integration

In **Settings → AI Integrations → + New Integration**:

| Field | Value |
|-------|-------|
| Name | `todo-generator` |
| Provider | OpenAI |
| Model | `gpt-4o` |
| System Prompt | *(see below)* |

**System Prompt:**

```
You are a task-planning assistant. When given a goal, you break it down into a list of concrete, actionable tasks.

Always respond with valid JSON in this exact format:
{
  "goal": "<the original goal>",
  "todos": [
    { "title": "<short title>", "description": "<step-by-step instructions for executing this task>" },
    ...
  ]
}

Do not include any text outside the JSON object. Keep titles under 80 characters. Include 3–7 tasks per goal.
```

Click **Save**.

### 2b. Use the Agent to Generate Todos and Save Them

Create a script called `generate-todos.ts` (or `.js`):

```typescript
import QelosSDK from '@qelos/sdk';

const APP_URL          = 'https://your-qelos-instance.com';
const INTEGRATION_ID   = 'your-todo-generator-integration-id'; // from the UI
const USERNAME         = 'your@email.com';
const PASSWORD         = 'yourpassword';

async function main(goal: string) {
  const sdk = new QelosSDK({ appUrl: APP_URL, fetch: globalThis.fetch, forceRefresh: true });
  await sdk.authentication.oAuthSignin({ username: USERNAME, password: PASSWORD });

  // Ask the agent to plan the goal
  const response = await sdk.ai.chat.chat(INTEGRATION_ID, {
    messages: [{ role: 'user', content: `Goal: ${goal}` }],
    temperature: 0.3,
  });

  const raw = response.choices[0].message.content;

  let plan: { goal: string; todos: { title: string; description: string }[] };
  try {
    plan = JSON.parse(raw);
  } catch {
    throw new Error(`Agent returned invalid JSON:\n${raw}`);
  }

  console.log(`Creating ${plan.todos.length} todos for goal: "${plan.goal}"`);

  const todoEntities = sdk.blueprints.entitiesOf('todos');

  for (const todo of plan.todos) {
    await todoEntities.create({
      title: todo.title,
      description: todo.description,
      status: 'pending',
      goal: plan.goal,
    });
    console.log(`  ✓ Created: ${todo.title}`);
  }

  console.log('Done.');
}

// Run: npx ts-node generate-todos.ts "Set up a CI/CD pipeline for a Node.js project"
main(process.argv[2] ?? 'Build a production-ready Node.js REST API');
```

Run the script:

```bash
npx ts-node generate-todos.ts "Set up a CI/CD pipeline for a Node.js project"
```

Check the **Todos** section in the Qelos admin to see the generated tasks.

---

## Part 3 — Build the Poller App

The poller app runs on a schedule, fetches pending todos one at a time, asks the agent what to do with each one, and then marks the todo as done (or failed).

### 3a. Create the Task-Executor Agent

Create a second integration called `task-executor` with this system prompt:

```
You are an AI assistant that executes tasks from a todo list.

When given a task title and description, you perform the task — which may involve:
- Writing code or documentation
- Drafting a plan or checklist
- Answering a technical question
- Generating configuration files

Return only the result of executing the task, ready to be stored.
```

### 3b. Write the Poller Script

Create `poller.ts`:

```typescript
import QelosSDK from '@qelos/sdk';

const APP_URL        = 'https://your-qelos-instance.com';
const EXECUTOR_ID    = 'your-task-executor-integration-id';
const USERNAME       = 'your@email.com';
const PASSWORD       = 'yourpassword';
const POLL_INTERVAL  = 10_000; // milliseconds between polls

interface Todo {
  _id: string;
  title: string;
  description?: string;
  status: string;
  goal?: string;
}

async function executeTodo(sdk: QelosSDK, todo: Todo): Promise<void> {
  const todos = sdk.blueprints.entitiesOf<Todo>('todos');

  // Mark as in-progress so other pollers skip it
  await todos.update(todo._id, { status: 'in_progress' });
  console.log(`[→] Executing: ${todo.title}`);

  try {
    const userMessage = [
      `Task: ${todo.title}`,
      todo.description ? `Instructions: ${todo.description}` : '',
      todo.goal ? `Part of goal: "${todo.goal}"` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const response = await sdk.ai.chat.chat(EXECUTOR_ID, {
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.4,
    });

    const result = response.choices[0].message.content;

    await todos.update(todo._id, { status: 'done', result });
    console.log(`[✓] Done:     ${todo.title}`);
  } catch (err) {
    await todos.update(todo._id, {
      status: 'failed',
      result: String(err),
    });
    console.error(`[✗] Failed:  ${todo.title}`, err);
  }
}

async function poll(sdk: QelosSDK): Promise<void> {
  const todos = sdk.blueprints.entitiesOf<Todo>('todos');

  const pending = await todos.getList({
    status: 'pending',
    $limit: 1,
    $sort: 'created', // oldest first
  });

  if (!pending || pending.length === 0) {
    console.log('[·] No pending todos. Waiting...');
    return;
  }

  await executeTodo(sdk, pending[0]);
}

async function main() {
  const sdk = new QelosSDK({ appUrl: APP_URL, fetch: globalThis.fetch, forceRefresh: true });
  await sdk.authentication.oAuthSignin({ username: USERNAME, password: PASSWORD });

  console.log(`Poller started. Checking every ${POLL_INTERVAL / 1000}s...`);

  // Run immediately, then on interval
  await poll(sdk);
  setInterval(() => poll(sdk), POLL_INTERVAL);
}

main().catch(console.error);
```

### 3c. Run the Poller

```bash
npx ts-node poller.ts
```

The output will look like:

```
Poller started. Checking every 10s...
[→] Executing: Set up GitHub Actions workflow
[✓] Done:     Set up GitHub Actions workflow
[→] Executing: Configure Docker multi-stage build
[✓] Done:     Configure Docker multi-stage build
[·] No pending todos. Waiting...
```

---

## Part 4 — Using the CLI Agent to Inspect and Interact

You can inspect the system at any point using the CLI.

### Check how many todos are still pending

```bash
# Use the agent to summarize the current state
qelos agent todo-generator \
  --message "How many tasks are typically still pending after a CI/CD goal?"
```

### Manually trigger generation from the terminal

```bash
qelos agent todo-generator \
  --message "Goal: Migrate a PostgreSQL database to a managed cloud service" \
  --export ./plan.json
```

Then feed the output JSON into your `generate-todos.ts` script.

### Stream the executor's response to a file

```bash
qelos agent task-executor \
  --stream \
  --message "Task: Write a Dockerfile for a Node.js 20 application" \
  --export ./dockerfile.md
```

---

## Architecture Summary

```
generate-todos.ts
  └─ calls AI (todo-generator)
  └─ saves todos → todos blueprint (status: pending)

poller.ts (running continuously)
  └─ reads todos where status = pending
  └─ marks todo → in_progress
  └─ calls AI (task-executor) with title + description
  └─ stores result → marks todo → done (or failed)

Qelos Admin UI
  └─ lets you browse todos, check results, and requeue failed tasks
```

---

## Extending the System

Here are some ideas for taking this further:

- **Requeue failed tasks** — add a cron job that sets `failed` todos back to `pending` after a cooldown.
- **Priority field** — add a `priority` (number) field to the blueprint and sort the poller query by `-priority`.
- **Webhook trigger** — instead of polling, use a Qelos lambda (serverless function) that fires when a new todo is created.
- **Human-in-the-loop** — add an `approved` boolean field; the poller only executes todos where `approved = true`.
- **Notifications** — call a Slack or email webhook from the poller when all todos in a goal are complete.

---

## Related Resources

- [Blueprints Operations (SDK)](/sdk/blueprints_operations)
- [AI Operations (SDK)](/sdk/ai_operations)
- [CLI Agent Command](/cli/agent)
- [Lambda / Serverless Operations](/sdk/lambdas)
