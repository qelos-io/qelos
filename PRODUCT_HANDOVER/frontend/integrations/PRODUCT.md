# Integrations & AI Agents

Connect external services, build workflows, and configure AI agents.

## What Users Can Do

- **View integrations hub**: Three views — Connections, Integrations, Workflows diagram
- **Manage connections**: Per-provider source management (OpenAI, HTTP, Paddle, etc.)
- **Create integrations**: Modal workflow — type, trigger, target, data manipulation
- **Build AI agents**: Dedicated wizard for chatCompletion agents with tools and prompts
- **Use admin AI assistant**: Header AI drawer for natural-language app building

## Integrations Hub Views

| View | Purpose |
|------|---------|
| **Connections** | List all integration sources by provider |
| **Integrations** | List trigger-to-target workflows |
| **Workflows** | Visual diagram of integration flows |

## Integration Source Providers

OpenAI, Claude, Gemini, HTTP, Email, Google, GitHub, LinkedIn, Facebook, Paddle, PayPal, Sumit, DodoPayments, Qelos

**DodoPayments connection fields**: Connection Name, Labels, Environment (`test` | `live`), API Key

Routes: `/integrations/:kind/sources`

## AI Agent Builder Steps

1. **Identity** — Name, roles, workspace labels
2. **Configuration** — Model, temperature, system prompt
3. **Tools** — Function tools, agent-to-agent links, blueprint CRUD tools
4. **Context** — Vector storage, ingested data
5. **Connections** — Link OpenAI/Gemini/Claude provider source

## Admin AI Assistant

- Header AI button opens side drawer
- Contextual chat for creating blueprints, pages, components, permissions
- Backed by privileged admin chat completion endpoints

## Related

- [AI API](../../api/ai.md)
- [Plugins API](../../api/plugins.md)
- [Events log](../admin-tools/PRODUCT.md)
