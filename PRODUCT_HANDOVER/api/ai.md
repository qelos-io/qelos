# AI Agents & Chat

AI agents, chat completion, conversation threads, vector storage, and admin builder assistants.

## What Users Can Do

- **Manage agents**: Create, configure, activate/deactivate AI agents backed by LLM integrations
- **Chat with agents**: Send messages via JSON or streaming SSE; auto-create/reuse threads
- **Run completions**: Integration-based chat with tools, rules, vector search, web search, code interpreter
- **Manage threads**: Create, list, view history, delete conversation threads
- **Use admin assistants**: Privileged SaaS-builder, pages, integrations, and plain chat agents
- **Generate blueprints**: Natural-language app ideas → suggested data model schemas
- **Manage vector storage**: Upload content for RAG/file search on agents

## Agent Endpoints

### GET /api/ai/agents
List agents; filter by active status and kind.

### GET /api/ai/agents/:agentId
Retrieve agent (name, model, system prompt, tools, sources).

### POST /api/ai/agents
Create agent with trigger source, target LLM, prompt, tools.

### PUT /api/ai/agents/:agentId
Update agent configuration.

### DELETE /api/ai/agents/:agentId
Remove agent.

### POST /api/ai/agents/:agentId/chat
Send messages; returns JSON.

### GET /api/ai/agents/:agentId/chat
Stream chat via SSE.

## Thread Endpoints

### POST /api/ai/threads
Start conversation thread; optionally provisions vector store.

### GET /api/ai/threads
List threads for current user; admins filter by user/workspace/integration.

### GET /api/ai/threads/:threadId
Retrieve thread with full message history.

### DELETE /api/ai/threads/:threadId
Delete thread and clean up vector store.

## Admin Assistant Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/ai/sources-chat-completion/general` | Orchestrate blueprints, pages, integrations |
| `/api/ai/sources-chat-completion/pages` | Create/edit pages and Vue components |
| `/api/ai/sources-chat-completion/integrations` | Manage external integrations |
| `/api/ai/sources-chat-completion/plain` | Direct LLM chat without builder tools |
| `/api/ai/sources-chat-completion/blueprints` | Generate blueprint schemas from prompts |

## Vector Storage

### POST .../vector-storage
Provision scoped vector store (thread/user/workspace/tenant).

### POST .../vector-storage/upload
Upload text/JSON for RAG retrieval.

### DELETE .../vector-storage
Clear files from vector store.

## Related

- [Integrations hub](../frontend/integrations/PRODUCT.md)
- [AI Agent Builder](../frontend/integrations/PRODUCT.md)
- [SDK AI module](../sdk/PRODUCT.md)
