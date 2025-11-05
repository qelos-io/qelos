# Qelos MCP Server

A Model Context Protocol (MCP) server that exposes Qelos API functionality as MCP tools and resources. Built with the official `@modelcontextprotocol/sdk` for seamless integration with AI assistants like Claude, Cursor, and VS Code Copilot.

## Features

- 🔧 **MCP Tools** - Execute Qelos operations (list workspaces, manage blueprints, etc.)
- 📚 **MCP Resources** - Access Qelos data (user info, configurations)
- 🔐 **Secure Authentication** - Automatic Qelos API authentication
- 🎯 **Type-Safe** - Full TypeScript support with Zod schemas
- 🔄 **stdio Transport** - Standard MCP communication protocol
- 🛠️ **Extensible** - Easy to add new tools and resources

## Setup

### 1. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env` file in this directory:

```bash
cp .env.example .env
```

Edit `.env` with your Qelos credentials:

```env
MCP_QELOS_URL=http://localhost:3000
MCP_QELOS_USERNAME=test@test.com
MCP_QELOS_PASSWORD=admin
```

### 3. Test with MCP Inspector

The easiest way to test your MCP server:

```bash
pnpm inspect
```

This will open the MCP Inspector where you can:
- See all available tools and resources
- Test tool execution
- View structured responses

### 4. Connect to AI Assistants

#### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "qelos": {
      "command": "node",
      "args": ["--import", "tsx", "/path/to/qelos/apps/local-mcp/index.ts"],
      "env": {
        "MCP_QELOS_URL": "http://localhost:3000",
        "MCP_QELOS_USERNAME": "your-email@example.com",
        "MCP_QELOS_PASSWORD": "your-password"
      }
    }
  }
}
```

#### Windsurf

Windsurf has native MCP support! The configuration is already set up in `.windsurf/mcp.json` at the workspace root.

Just reload Windsurf and start using the tools in Cascade:
- "List all my Qelos workspaces"
- "Get entities from blueprint [id]"
- "Show me the current user information"

See [WINDSURF.md](./WINDSURF.md) for detailed Windsurf setup and usage.

#### Cursor / VS Code

Follow similar configuration for your IDE's MCP settings.

## Project Structure

```
apps/local-mcp/
├── index.ts              # Main MCP server
├── tools/                # MCP tools (one file per tool)
│   ├── types.ts          # Shared types
│   ├── index.ts          # Tool registry
│   ├── list-workspaces.ts
│   ├── get-blueprint-entities.ts
│   ├── create-blueprint-entity.ts
│   ├── get-app-config.ts
│   └── README.md         # Tool development guide
├── resources/            # MCP resources
│   ├── types.ts          # Shared types
│   ├── index.ts          # Resource registry
│   ├── current-user.ts
│   └── README.md         # Resource development guide
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Adding New Tools

### Quick Start

1. **Create a new tool file** in `tools/`:

```typescript
// tools/my-new-tool.ts
import { z } from 'zod';
import type { ToolRegistration } from './types';

export const registerMyNewTool: ToolRegistration = (server, context) => {
  server.registerTool(
    'my-new-tool',
    {
      title: 'My New Tool',
      description: 'What this tool does',
      inputSchema: {
        param1: z.string().describe('Parameter description'),
      },
      outputSchema: {
        result: z.string(),
      }
    },
    async ({ param1 }) => {
      await context.ensureAuthenticated();
      const result = await context.sdk.someMethod(param1);
      return {
        content: [{ type: 'text', text: JSON.stringify({ result }, null, 2) }],
        structuredContent: { result }
      };
    }
  );
};
```

2. **Register it** in `tools/index.ts`:

```typescript
import { registerMyNewTool } from './my-new-tool';

export const allTools: ToolRegistration[] = [
  // ... existing tools
  registerMyNewTool,  // Add here
];
```

3. **Test it**:

```bash
pnpm inspect
```

That's it! See `tools/README.md` for detailed documentation.

## Available Tools

### `list-workspaces`
Get all workspaces from Qelos.

**Output:**
```json
{
  "workspaces": [
    {
      "id": "workspace-id",
      "name": "My Workspace",
      "labels": ["production"]
    }
  ]
}
```

### `get-blueprint-entities`
Fetch entities from a specific blueprint.

**Input:**
- `blueprintId` (string) - The blueprint ID
- `limit` (number, optional) - Maximum entities to return

**Output:**
```json
{
  "entities": [...],
  "count": 10
}
```

### `create-blueprint-entity`
Create a new entity in a blueprint.

**Input:**
- `blueprintId` (string) - The blueprint ID
- `data` (object) - Entity data as key-value pairs

**Output:**
```json
{
  "id": "entity-id",
  "success": true
}
```

### `get-app-config`
Retrieve application configuration.

**Output:**
```json
{
  "config": { ... }
}
```

## Available Resources

### `qelos://user/current`
Information about the authenticated user.

**Returns:** User profile data in JSON format

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MCP_QELOS_URL` | Qelos API base URL | Yes | - |
| `MCP_QELOS_USERNAME` | Qelos username/email | Yes | - |
| `MCP_QELOS_PASSWORD` | Qelos password | Yes | - |

## Architecture

```
┌──────────────────────┐
│   AI Assistant       │
│  (Claude/Cursor)     │
└──────────┬───────────┘
           │ MCP Protocol (stdio)
           ▼
┌──────────────────────┐
│   MCP Server         │
├──────────────────────┤
│  - Tools             │
│  - Resources         │
│  - Authentication    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Qelos SDK          │
├──────────────────────┤
│  - Workspaces        │
│  - Blueprints        │
│  - Configurations    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Qelos API          │
└──────────────────────┘
```

## Error Handling

The service includes comprehensive error handling:

- Environment variable validation on startup
- Authentication error handling
- Graceful shutdown on SIGINT/SIGTERM
- Health check for monitoring

## License

MIT
