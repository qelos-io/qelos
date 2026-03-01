---
title: Tutorials
editLink: true
---

# Tutorials

Step-by-step guides to help you build real things with Qelos. Each tutorial walks you through a complete, working example from start to finish.

## Available Tutorials

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 24px;">

  <div style="border: 1px solid var(--vp-c-divider); border-radius: 12px; padding: 24px;">
    <div style="font-size: 2rem; margin-bottom: 12px;">🚀</div>
    <h3 style="margin: 0 0 8px;">Create an App & Add OpenAI Token</h3>
    <p style="color: var(--vp-c-text-2); margin: 0 0 16px;">Add an OpenAI connection to your Qelos instance so agents can use it to power AI features in your product.</p>
    <a href="./create-app-openai-token">Start tutorial →</a>
  </div>

  <div style="border: 1px solid var(--vp-c-divider); border-radius: 12px; padding: 24px;">
    <div style="font-size: 2rem; margin-bottom: 12px;">🤖</div>
    <h3 style="margin: 0 0 8px;">Configure Your First AI Agent</h3>
    <p style="color: var(--vp-c-text-2); margin: 0 0 16px;">Create an AI integration, give it a persona and instructions, then chat with it through the UI, the CLI, and the SDK.</p>
    <a href="./configure-first-ai-agent">Start tutorial →</a>
  </div>

  <div style="border: 1px solid var(--vp-c-divider); border-radius: 12px; padding: 24px;">
    <div style="font-size: 2rem; margin-bottom: 12px;">⚙️</div>
    <h3 style="margin: 0 0 8px;">Build an Agentic Todo Machine</h3>
    <p style="color: var(--vp-c-text-2); margin: 0 0 16px;">Build a fully autonomous system: an AI agent generates todos, and a poller app picks them up, executes the tasks, and updates their status — all without human interaction.</p>
    <a href="./agentic-todo-machine">Start tutorial →</a>
  </div>

</div>

## Prerequisites

Before starting any tutorial, make sure you have access to a Qelos instance — either:

- **Cloud (recommended):** Sign up at [app.qelos.io](https://app.qelos.io) to get a fully managed instance with no setup required, or
- **Self-hosted:** Run Qelos locally by following the [Installation Guide](/getting-started/installation).

You will also need:

- The Qelos CLI installed (`npm install -g @qelos/cli`) and a `.env` file with `QELOS_URL` and either `QELOS_USERNAME`+`QELOS_PASSWORD` or `QELOS_API_TOKEN`
- Node.js v20 or later
