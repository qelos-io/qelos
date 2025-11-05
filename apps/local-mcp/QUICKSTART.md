# Quick Start Guide

## 1. Setup Environment

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

## 2. Install Dependencies

From the monorepo root:

```bash
pnpm install
```

This will install:
- `@modelcontextprotocol/sdk` - Official MCP SDK
- `@qelos/sdk` - Qelos API SDK (from workspace)
- `zod` - Schema validation
- `dotenv` - Environment variables

## 3. Test with MCP Inspector

The MCP Inspector is the best way to test your server:

```bash
pnpm inspect
```

This will:
1. Start your MCP server
2. Open a web interface at `http://localhost:5173`
3. Show all available tools and resources
4. Let you test tool execution interactively

### What You'll See:

**Tools:**
- `list-workspaces` - Get all workspaces
- `get-blueprint-entities` - Fetch blueprint entities
- `create-blueprint-entity` - Create new entities
- `get-app-config` - Get app configuration

**Resources:**
- `qelos://user/current` - Current user information

## 4. Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "qelos": {
      "command": "npx",
      "args": [
        "-y",
        "tsx",
        "/absolute/path/to/qelos/apps/local-mcp/index.ts"
      ],
      "env": {
        "MCP_QELOS_URL": "http://localhost:3000",
        "MCP_QELOS_USERNAME": "your-email@example.com",
        "MCP_QELOS_PASSWORD": "your-password"
      }
    }
  }
}
```

Restart Claude Desktop, and you'll see the Qelos tools available!

## 5. Use in Claude

Once connected, you can ask Claude:

- "List all my Qelos workspaces"
- "Get entities from blueprint [id]"
- "Create a new entity in blueprint [id] with data {...}"
- "Show me the current user information"

## 6. Adding Custom Tools

Edit `index.ts` and add to the `registerTools()` method:

```typescript
this.server.registerTool(
  'my-custom-tool',
  {
    title: 'My Custom Tool',
    description: 'What this tool does',
    inputSchema: {
      param1: z.string().describe('Parameter description'),
    },
    outputSchema: {
      result: z.string(),
    }
  },
  async ({ param1 }) => {
    await this.ensureAuthenticated();
    // Your logic using this.sdk
    const result = await this.sdk.someMethod(param1);
    return {
      content: [{ type: 'text', text: JSON.stringify({ result }, null, 2) }],
      structuredContent: { result }
    };
  }
);
```

## Troubleshooting

### "Missing required environment variables"

Make sure you've created a `.env` file with all required variables.

### "Failed to authenticate with Qelos"

- Verify your credentials are correct
- Ensure the Qelos API is running at the specified URL
- Check network connectivity

### MCP Inspector not opening

Make sure port 5173 is available. If not, the inspector will use a different port.

### Claude not showing tools

1. Verify the config file path is correct
2. Restart Claude Desktop completely
3. Check Claude's MCP logs for errors
4. Ensure the absolute path to `index.ts` is correct

## Next Steps

- Add more tools for your specific use cases
- Create resources for frequently accessed data
- Set up prompts for common workflows
- Integrate with other MCP clients (Cursor, VS Code)

## Learn More

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Qelos SDK Documentation](../../packages/sdk/README.md)
