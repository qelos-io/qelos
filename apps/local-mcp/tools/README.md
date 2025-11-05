# MCP Tools

This directory contains all MCP tools for the Qelos server. Each tool is in its own file for better organization and maintainability.

## Structure

```
tools/
├── types.ts                      # Shared types for tools
├── index.ts                      # Tool registry (import all tools here)
├── list-workspaces.ts           # Example tool
├── get-blueprint-entities.ts    # Example tool
└── your-new-tool.ts             # Your new tool
```

## Creating a New Tool

### 1. Create a new file

Create `tools/your-tool-name.ts`:

```typescript
import { z } from 'zod';
import type { ToolRegistration } from './types';

/**
 * Tool: Your Tool Name
 * Brief description of what this tool does
 */
export const registerYourToolName: ToolRegistration = (server, context) => {
  server.registerTool(
    'your-tool-name',  // Tool ID (kebab-case)
    {
      title: 'Your Tool Name',  // Display name
      description: 'What this tool does',
      inputSchema: {
        // Define input parameters with Zod schemas
        param1: z.string().describe('Description of param1'),
        param2: z.number().optional().describe('Optional parameter'),
      },
      outputSchema: {
        // Define output structure
        result: z.string(),
        count: z.number(),
      }
    },
    async ({ param1, param2 }) => {
      // Ensure authentication
      await context.ensureAuthenticated();
      
      // Use the Qelos SDK
      const data = await context.sdk.someMethod(param1);
      
      // Prepare output
      const output = {
        result: data.value,
        count: data.items.length
      };
      
      // Return formatted response
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output
      };
    }
  );
};
```

### 2. Register the tool

Add your tool to `tools/index.ts`:

```typescript
import { registerYourToolName } from './your-tool-name';

export const allTools: ToolRegistration[] = [
  // ... existing tools
  registerYourToolName,  // Add your tool here
];
```

### 3. Test your tool

```bash
pnpm inspect
```

That's it! Your tool is now available in the MCP server.

## Available Context

Each tool receives a `context` object with:

- **`context.sdk`** - Qelos SDK instance with all modules:
  - `sdk.workspaces` - Workspace operations
  - `sdk.blueprints` - Blueprint operations
  - `sdk.authentication` - Auth operations
  - `sdk.appConfigurations` - Config operations
  - `sdk.blocks` - Block operations
  - `sdk.invites` - Invite operations

- **`context.ensureAuthenticated()`** - Ensures the SDK is authenticated before making API calls

## Input Schema with Zod

Use Zod to define type-safe input parameters:

```typescript
inputSchema: {
  // Required string
  name: z.string().describe('User name'),
  
  // Optional number with default
  limit: z.number().optional().default(10).describe('Max results'),
  
  // Enum
  status: z.enum(['active', 'inactive']).describe('Status filter'),
  
  // Array
  tags: z.array(z.string()).describe('List of tags'),
  
  // Object
  metadata: z.record(z.any()).describe('Key-value metadata'),
  
  // Complex object
  user: z.object({
    name: z.string(),
    email: z.string().email(),
  }).describe('User information'),
}
```

## Output Format

Always return both `content` and `structuredContent`:

```typescript
return {
  // Text content for display
  content: [{ 
    type: 'text', 
    text: JSON.stringify(output, null, 2) 
  }],
  
  // Structured data for programmatic access
  structuredContent: output
};
```

## Error Handling

Errors are automatically handled by the MCP SDK. For custom error messages:

```typescript
if (!blueprintId) {
  throw new Error('Blueprint ID is required');
}
```

## Best Practices

1. **One tool per file** - Keep tools focused and maintainable
2. **Descriptive names** - Use clear, action-oriented names
3. **Document parameters** - Use `.describe()` for all parameters
4. **Validate inputs** - Use Zod schemas for type safety
5. **Handle errors** - Throw meaningful error messages
6. **Test thoroughly** - Use MCP Inspector to test your tools

## Examples

See existing tools for reference:
- `list-workspaces.ts` - Simple tool with no parameters
- `get-blueprint-entities.ts` - Tool with required and optional parameters
- `create-blueprint-entity.ts` - Tool that modifies data

## TypeScript Support

All tools are fully typed. The IDE will provide:
- Autocomplete for SDK methods
- Type checking for parameters
- IntelliSense for Zod schemas
