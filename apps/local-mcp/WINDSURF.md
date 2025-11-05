# Using Qelos MCP Server in Windsurf

Windsurf has native MCP support built-in. Here's how to configure it.

## Configuration

### Option 1: Workspace Settings (Recommended)

Create or update `.windsurf/settings.json` in your workspace root:

```json
{
  "mcp.servers": {
    "qelos": {
      "command": "npx",
      "args": ["-y", "tsx", "/absolute/path/to/qelos/apps/local-mcp/index.ts"],
      "env": {
        "MCP_QELOS_URL": "http://localhost:3000",
        "MCP_QELOS_USERNAME": "test@test.com",
        "MCP_QELOS_PASSWORD": "admin"
      }
    }
  }
}
```

### Option 2: Global Settings

1. Open Windsurf Settings (Cmd+,)
2. Search for "MCP"
3. Add the server configuration:

```json
{
  "mcp.servers": {
    "qelos": {
      "command": "npx",
      "args": ["-y", "tsx", "/Users/davidmeirlevy/dev/qelos/qelos/apps/local-mcp/index.ts"],
      "env": {
        "MCP_QELOS_URL": "http://localhost:3000",
        "MCP_QELOS_USERNAME": "test@test.com",
        "MCP_QELOS_PASSWORD": "admin"
      }
    }
  }
}
```

## Using the MCP Server in Windsurf

Once configured, you can use the Qelos tools in Cascade (Windsurf's AI):

### Available Tools

Ask Cascade to:
- "List all my Qelos workspaces"
- "Get entities from blueprint [blueprint-id]"
- "Create a new entity in blueprint [blueprint-id] with this data: {...}"
- "Show me the app configuration"

### Available Resources

Access resources:
- "Show me the current user information from Qelos"

## Verifying the Connection

1. **Reload Windsurf** after adding the configuration
2. **Check MCP Status**: Look for MCP indicators in Windsurf's status bar
3. **Test in Cascade**: Ask "What Qelos tools are available?"

## Troubleshooting

### Server Not Starting

If the MCP server doesn't start:

1. **Check the logs**: Windsurf shows MCP logs in the Output panel
2. **Verify environment variables**: Make sure your Qelos instance is running
3. **Test manually**:
   ```bash
   cd apps/local-mcp
   pnpm start
   ```

### Authentication Issues

If you see authentication errors:
- Verify `MCP_QELOS_URL` is correct
- Check `MCP_QELOS_USERNAME` and `MCP_QELOS_PASSWORD`
- Ensure your Qelos API is accessible

### Tools Not Appearing

1. Reload Windsurf window (Cmd+Shift+P → "Reload Window")
2. Check MCP server status in Output panel
3. Verify the configuration path is correct

## Development Workflow

When developing new tools:

1. **Add your tool** in `tools/your-tool.ts`
2. **Register it** in `tools/index.ts`
3. **Reload Windsurf** to pick up changes
4. **Test in Cascade** by asking to use the new tool

## Example Usage in Cascade

```
You: "List all my Qelos workspaces"
Cascade: [Uses list-workspaces tool and shows results]

You: "Get the first 10 entities from blueprint abc123"
Cascade: [Uses get-blueprint-entities tool with blueprintId and limit]

You: "Create a new user entity with name 'John Doe' and email 'john@example.com'"
Cascade: [Uses create-blueprint-entity tool]
```

## Advanced: Using with .env

For security, you can use a `.env` file instead of hardcoding credentials:

1. Create `apps/local-mcp/.env`:
   ```env
   MCP_QELOS_URL=http://localhost:3000
   MCP_QELOS_USERNAME=test@test.com
   MCP_QELOS_PASSWORD=admin
   ```

2. Update Windsurf config to use the working directory:
   ```json
   {
     "mcp.servers": {
       "qelos": {
         "command": "npx",
         "args": ["-y", "tsx", "index.ts"],
         "cwd": "${workspaceFolder}/apps/local-mcp"
       }
     }
   }
   ```

The server will automatically load the `.env` file!

## Tips

- **Use descriptive requests**: The more specific you are, the better Cascade can use the tools
- **Check available tools**: Ask "What Qelos tools can you use?"
- **Combine tools**: Cascade can chain multiple tool calls to accomplish complex tasks
- **Resources are cached**: Resources like current-user are cached for performance

## Need Help?

- Check the main [README.md](./README.md) for tool documentation
- See [QUICKSTART.md](./QUICKSTART.md) for setup details
- Review [tools/README.md](./tools/README.md) for creating new tools
