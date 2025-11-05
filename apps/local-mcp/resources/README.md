# MCP Resources

This directory contains all MCP resources for the Qelos server. Resources provide read-only access to data, unlike tools which can perform actions.

## Structure

```
resources/
├── types.ts           # Shared types for resources
├── index.ts           # Resource registry (import all resources here)
├── current-user.ts    # Example resource
└── your-resource.ts   # Your new resource
```

## Creating a New Resource

### 1. Create a new file

Create `resources/your-resource.ts`:

```typescript
import type { ResourceRegistration } from './types';

/**
 * Resource: Your Resource Name
 * Brief description of what this resource provides
 */
export const registerYourResource: ResourceRegistration = (server, context) => {
  server.registerResource(
    'resource-id',  // Resource ID
    'qelos://your/resource/uri',  // Resource URI
    {
      title: 'Your Resource',
      description: 'What this resource provides',
      mimeType: 'application/json'
    },
    async (uri) => {
      await context.ensureAuthenticated();
      
      const data = await context.sdk.someMethod();
      
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(data, null, 2),
          mimeType: 'application/json'
        }]
      };
    }
  );
};
```

### 2. Register the resource

Add to `resources/index.ts`:

```typescript
import { registerYourResource } from './your-resource';

export const allResources: ResourceRegistration[] = [
  // ... existing resources
  registerYourResource,
];
```

## Resources vs Tools

**Use Resources when:**
- Providing read-only access to data
- Data is frequently accessed
- No parameters needed (or simple URI parameters)

**Use Tools when:**
- Performing actions or modifications
- Complex input parameters needed
- Side effects are expected

## URI Patterns

Resources use URI patterns:

```typescript
// Static resource
'qelos://config/app'

// Dynamic resource with parameters
'qelos://users/{userId}/profile'

// Nested resources
'qelos://workspaces/{workspaceId}/blueprints/{blueprintId}'
```

## Best Practices

1. **Read-only** - Resources should not modify data
2. **Cacheable** - Data should be relatively stable
3. **Descriptive URIs** - Use clear, hierarchical URI patterns
4. **JSON format** - Prefer JSON for structured data
5. **Document clearly** - Explain what data the resource provides
