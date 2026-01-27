---
title: Endpoints
---
# Endpoints

Documentation coming soon.

Learn how to add API endpoints to your plugin.

## Adding an Endpoint

```typescript
import { addEndpoint } from '@qelos/plugin-play';

addEndpoint('/api/hello', {
  method: 'GET',
  handler: async (request, reply) => {
    return { message: 'Hello!' };
  }
});
```

## Adding a Proxy Endpoint

```typescript
import { addProxyEndpoint } from '@qelos/plugin-play';

addProxyEndpoint('/data', {
  method: 'GET',
  handler: async (request, reply) => {
    // Automatically authenticated
    return { data: [] };
  }
});
```
