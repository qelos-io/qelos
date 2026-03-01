---
title: Create an App and Add Your OpenAI Token
editLink: true
---

# Create an App and Add Your OpenAI Token

In this tutorial you will:

1. Log in to your Qelos instance
2. Add an OpenAI connection (where the API key lives)
3. Pull the configuration locally with the CLI

**Estimated time:** 10 minutes

---

## Prerequisites

- A Qelos instance — either sign up at [app.qelos.io](https://app.qelos.io) for a managed cloud instance, or run it locally by following the [Installation Guide](/getting-started/installation).
- An OpenAI account with an active API key. You can create one at [platform.openai.com](https://platform.openai.com/api-keys).

---

## Step 1 — Log In to Your Qelos Admin

Open your browser and navigate to your Qelos instance (e.g. `http://localhost:3000`). Log in with your admin credentials.

> Default development credentials: `test@test.com` / `admin`

---

## Step 2 — Add an OpenAI Connection

In Qelos, a **connection** stores credentials for an external provider (like OpenAI). Agents (integrations) are built on top of connections — they add the model, system prompt, and behaviour, but the API key itself lives in the connection.

1. In the left sidebar, navigate to **Integrations → Connections**.
2. Find **OpenAI** in the list of available providers and click it.
3. Click **Create** to add a new OpenAI connection.
4. Paste your OpenAI API key into the **API Key** field.
5. Click **Save**.

> **Security note:** Your API key is stored encrypted in the Qelos database and is never exposed to frontend clients.

---

## Step 3 — Pull Your Config Locally (Optional)

If you plan to use the CLI or SDK, pull the full workspace configuration to your local project. This downloads connections, integrations, blueprints, and more into your working directory.

### Configure authentication via `.env`

Create a `.env` file in your project root with your Qelos instance URL and credentials:

```bash
# Required
QELOS_URL=https://your-instance.qelos.io   # or http://localhost:3000 for local

# Option A — username & password
QELOS_USERNAME=your@email.com
QELOS_PASSWORD=yourpassword

# Option B — API token
QELOS_API_TOKEN=your-api-token
```

### Pull everything

```bash
qelos pull all ./
```

You will see local files for each resource — connections, integrations, blueprints, and more. The `qelos agent` command uses these files to resolve integrations by name.

---

## What's Next?

Now that your OpenAI connection is in place you can:

- [Configure your first AI agent](/tutorials/configure-first-ai-agent) — create an integration (agent) that uses this connection, give it a persona, and start chatting with it.
- [AI Operations SDK reference](/sdk/ai_operations) — call the AI from your own code.
- [CLI Agent command](/cli/agent) — chat with an integration directly from the terminal.
