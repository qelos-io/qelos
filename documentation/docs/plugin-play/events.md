---
title: Event Subscriptions
---
# Event Subscriptions

Plugin Play allows your plugin to subscribe to platform events and react to changes in real-time. This is one of the most powerful features for building integrations.

## Overview

When you subscribe to an event, Plugin Play:
1. Registers a webhook endpoint for that event
2. Adds the subscription to your plugin manifest
3. Handles authentication and request validation
4. Calls your handler when the event occurs

## Subscribing to Events

### Basic Event Subscription

Use `registerToHook` to subscribe to events:

```typescript
import { registerToHook } from '@qelos/plugin-play';

registerToHook({
  source: 'auth',
  kind: 'users',
  eventName: 'user-created'
}, async (request, reply) => {
  const { user } = request.body;
  
  console.log('New user created:', user);
  
  // Your logic here
  await sendWelcomeEmail(user.email);
  
  return { received: true };
});
```

### Event with Source Filter

Subscribe to events from a specific source:

```typescript
registerToHook({
  source: 'auth-service',
  eventName: 'user.created'
}, async (request, reply) => {
  // Only receives events from auth-service
  const { user } = request.body;
  return { received: true };
});
```

### Event with Kind Filter

Subscribe to events of a specific kind:

```typescript
registerToHook({
  kind: 'user',
  eventName: 'created'
}, async (request, reply) => {
  // Receives all 'created' events for 'user' kind
  const { user } = request.body;
  return { received: true };
});
```

### Wildcard Subscriptions

Use wildcards to subscribe to multiple events:

```typescript
// Subscribe to all user events
registerToHook({
  kind: 'user',
  eventName: '*'
}, async (request, reply) => {
  const { eventName, data } = request.body;
  console.log(`User event: ${eventName}`, data);
  return { received: true };
});

// Subscribe to all events from a source
registerToHook({
  source: 'auth-service',
  eventName: '*'
}, async (request, reply) => {
  const { eventName, data } = request.body;
  console.log(`Auth service event: ${eventName}`, data);
  return { received: true };
});

// Subscribe to all events
registerToHook({
  source: '*',
  kind: '*',
  eventName: '*'
}, async (request, reply) => {
  console.log('Received event:', request.body);
  return { received: true };
});
```

## Event Handler

### Request Object

The request object contains:

```typescript
interface EventRequest {
  body: {
    eventName: string;
    source: string;
    kind: string;
    tenant: string;
    workspace?: string;
    user?: string;
    timestamp: string;
    data: any;
    metadata?: any;
  };
  headers: {
    authorization: string;
    'x-tenant': string;
    'x-workspace'?: string;
    'x-user'?: string;
  };
  tenant: string;  // Automatically parsed
  workspace?: string;
  user?: string;
}
```

### Handler Example

```typescript
registerToHook({
  eventName: 'order.created'
}, async (request, reply) => {
  const { 
    eventName, 
    data, 
    tenant, 
    workspace, 
    user 
  } = request.body;
  
  console.log('Event:', eventName);
  console.log('Tenant:', tenant);
  console.log('Workspace:', workspace);
  console.log('User:', user);
  console.log('Order data:', data);
  
  // Process the order
  await processOrder(data);
  
  // Return success
  return { 
    received: true,
    processed: true,
    orderId: data._id
  };
});
```

## Platform Event Types

Qelos dispatches various platform events that your plugin can subscribe to:

### Authentication Events

```typescript
// User registered (signup)
registerToHook({
  source: 'auth',
  kind: 'signup',
  eventName: 'user-registered'
}, async (request, reply) => {
  const { user } = request.body;
  await onUserRegistered(user);
  return { received: true };
});

// User created
registerToHook({
  source: 'auth',
  kind: 'users',
  eventName: 'user-created'
}, async (request, reply) => {
  const { user } = request.body;
  await onUserCreated(user);
  return { received: true };
});

// User updated
registerToHook({
  source: 'auth',
  kind: 'users',
  eventName: 'user-updated'
}, async (request, reply) => {
  const { user, changes } = request.body;
  await onUserUpdated(user, changes);
  return { received: true };
});

// User removed
registerToHook({
  source: 'auth',
  kind: 'users',
  eventName: 'user-removed'
}, async (request, reply) => {
  const { userId } = request.body;
  await onUserRemoved(userId);
  return { received: true };
});
```

### Social Login Failures

```typescript
// Failed LinkedIn login
registerToHook({
  source: 'auth',
  kind: 'failed-social-login',
  eventName: 'failed-linkedin-login'
}, async (request, reply) => {
  const { error, user } = request.body;
  await logFailedLogin('linkedin', error);
  return { received: true };
});

// Subscribe to all failed social logins
registerToHook({
  source: 'auth',
  kind: 'failed-social-login',
  eventName: '*'
}, async (request, reply) => {
  const { eventName, error } = request.body;
  console.log(`Failed social login: ${eventName}`, error);
  return { received: true };
});
```

### Asset Events

```typescript
// Asset uploaded
registerToHook({
  source: 'assets',
  kind: 'asset-operation',
  eventName: 'asset-uploaded'
}, async (request, reply) => {
  const { asset } = request.body;
  await processUploadedAsset(asset);
  return { received: true };
});

// Storage connection errors
registerToHook({
  source: 'assets',
  kind: 'storage-connection-error',
  eventName: '*'
}, async (request, reply) => {
  const { eventName, error } = request.body;
  console.error(`Storage error: ${eventName}`, error);
  await notifyAdmin(eventName, error);
  return { received: true };
});
```

### Complete Event List

| Source | Kind                     | Event Name                   | Description                    |
|--------|--------------------------|------------------------------|--------------------------------|
| auth   | signup                   | user-registered              | New user signed up             |
| auth   | users                    | user-created                 | User created by admin          |
| auth   | users                    | user-updated                 | User information updated       |
| auth   | users                    | user-removed                 | User deleted                   |
| auth   | failed-social-login      | failed-linkedin-login        | LinkedIn login failed          |
| auth   | failed-social-login      | failed-facebook-login        | Facebook login failed          |
| auth   | failed-social-login      | failed-google-login          | Google login failed            |
| auth   | failed-social-login      | failed-github-login          | Github login failed            |
| assets | asset-operation          | asset-uploaded               | File/asset uploaded            |
| assets | storage-connection-error | s3-connection-error          | S3 connection failed           |
| assets | storage-connection-error | gcs-connection-error         | Google Cloud Storage failed    |
| assets | storage-connection-error | ftp-connection-error         | FTP connection failed          |
| assets | storage-connection-error | cloudinary-connection-error  | Cloudinary connection failed   |
| auth   | invites                  | invite-responded             | User responded to an invite    |
| auth   | invites                  | invite-created               | New invite created             |
| auth   | workspaces               | workspace-created            | New workspace created          |
| auth   | workspaces               | workspace-deleted            | Workspace deleted              |
| ai     | threads                  | create                       | AI thread created              |
| ai     | threads                  | delete                       | AI thread deleted              |

### Blueprint Events

Blueprint events are dynamic and correspond to the `identifier` of a blueprint.

| Source      | Kind                   | Event Name | Description                    |
|-------------|------------------------|------------|--------------------------------|
| blueprints  | {blueprint.identifier} | create     | A new entity has been created  |
| blueprints  | {blueprint.identifier} | update     | An entity has been updated     |
| blueprints  | {blueprint.identifier} | delete     | An entity has been deleted     |

## Custom Plugin Events

Your plugin can dispatch custom events that other plugins can subscribe to. Custom plugin events are automatically prefixed with `plugin:` in the source field.

### Dispatching Custom Events

```typescript
import { getSdk } from '@qelos/plugin-play';

// Dispatch a custom event
await getSdk().events.dispatch({
  user: '111',
  source: 'my-plugin',
  kind: 'my-type',
  eventName: 'thing-changed',
  metadata: {
    customData: 1
  }
});
```

### Subscribing to Custom Plugin Events

When subscribing to custom plugin events, use the `plugin:` prefix in the source:

```typescript
import { registerToHook } from '@qelos/plugin-play';

registerToHook({
  source: 'plugin:my-plugin',
  kind: '*',
  eventName: '*'
}, async (request, reply) => {
  const { user, source, kind, eventName, metadata } = request.body;
  
  if (user === '111' && metadata.customData === 1 && eventName === 'thing-changed') {
    console.log('Custom event received!');
  }
  
  return { received: true };
});
```

### Custom Event Example

Here's a complete example of a plugin that dispatches and listens to custom events:

```typescript
import { registerToHook, getSdk } from '@qelos/plugin-play';

// Subscribe to custom events from another plugin
registerToHook({
  source: 'plugin:order-service',
  kind: 'order',
  eventName: 'order-completed'
}, async (request, reply) => {
  const { order } = request.body;
  
  // Process the completed order
  await sendInvoice(order);
  
  // Dispatch our own event
  await getSdk().events.dispatch({
    source: 'invoice-service',
    kind: 'invoice',
    eventName: 'invoice-sent',
    metadata: {
      orderId: order._id,
      invoiceId: 'INV-123'
    }
  });
  
  return { received: true };
});
```

## Error Handling

### Handling Errors

```typescript
registerToHook({
  eventName: 'order.created'
}, async (request, reply) => {
  try {
    const { data } = request.body;
    await processOrder(data);
    return { received: true, success: true };
  } catch (error) {
    console.error('Error processing order:', error);
    
    // Return error response
    reply.code(500);
    return { 
      received: true, 
      success: false,
      error: error.message 
    };
  }
});
```

### Using ResponseError

```typescript
import { registerToHook, ResponseError } from '@qelos/plugin-play';

registerToHook({
  eventName: 'payment.process'
}, async (request, reply) => {
  const { amount, currency } = request.body.data;
  
  if (amount <= 0) {
    throw new ResponseError('Invalid amount', 400);
  }
  
  if (!['USD', 'EUR', 'GBP'].includes(currency)) {
    throw new ResponseError('Unsupported currency', 400);
  }
  
  await processPayment(amount, currency);
  return { received: true, success: true };
});
```

## Async Processing

### Background Jobs

For long-running tasks, acknowledge the event immediately and process asynchronously:

```typescript
registerToHook({
  eventName: 'report.generate'
}, async (request, reply) => {
  const { reportId, params } = request.body.data;
  
  // Acknowledge immediately
  reply.send({ received: true, processing: true });
  
  // Process in background
  setImmediate(async () => {
    try {
      await generateReport(reportId, params);
      console.log('Report generated:', reportId);
    } catch (error) {
      console.error('Report generation failed:', error);
    }
  });
});
```

### Using Queue Systems

For production, use a queue system:

```typescript
import { Queue } from 'bull';

const orderQueue = new Queue('orders', process.env.REDIS_URL);

registerToHook({
  eventName: 'order.created'
}, async (request, reply) => {
  const { data } = request.body;
  
  // Add to queue
  await orderQueue.add('process', data);
  
  return { 
    received: true, 
    queued: true 
  };
});

// Process queue
orderQueue.process('process', async (job) => {
  await processOrder(job.data);
});
```

## SDK Integration

### Using SDK in Event Handlers

Access the Qelos SDK to make API calls:

```typescript
import { registerToHook, getSdkForTenant } from '@qelos/plugin-play';

registerToHook({
  eventName: 'user.created'
}, async (request, reply) => {
  const { user, tenant } = request.body;
  
  // Get SDK for this tenant
  const sdk = await getSdkForTenant(tenant);
  
  // Create a welcome block
  await sdk.blocks.create({
    name: `Welcome ${user.fullName}`,
    content: `Welcome to our platform, ${user.firstName}!`,
    contentType: 'html'
  });
  
  return { received: true };
});
```

## Testing Event Handlers

### Manual Testing

Test your event handler with curl:

```bash
curl -X POST http://localhost:3000/api/hooks/<hook-path> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{
    "eventName": "user.created",
    "source": "auth-service",
    "kind": "user",
    "tenant": "tenant-id",
    "timestamp": "2025-01-01T00:00:00Z",
    "data": {
      "user": {
        "_id": "user-123",
        "email": "test@example.com",
        "fullName": "Test User"
      }
    }
  }'
```

### Unit Testing

```typescript
import { test } from 'node:test';
import { getApp } from '@qelos/plugin-play';

test('user.created event handler', async (t) => {
  const app = getApp();
  
  const response = await app.inject({
    method: 'POST',
    url: '/api/hooks/user-created',
    headers: {
      'content-type': 'application/json',
      'authorization': 'Bearer test-token'
    },
    payload: {
      eventName: 'user.created',
      data: {
        user: {
          _id: 'user-123',
          email: 'test@example.com'
        }
      }
    }
  });
  
  assert.strictEqual(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.received, true);
});
```

## Best Practices

1. **Acknowledge Quickly**: Return a response quickly to avoid timeouts
2. **Process Asynchronously**: Use background jobs for long-running tasks
3. **Handle Errors Gracefully**: Always catch and log errors
4. **Validate Data**: Validate event data before processing
5. **Use Idempotency**: Handle duplicate events gracefully
6. **Log Events**: Log all events for debugging and auditing
7. **Monitor Performance**: Track event processing times
8. **Use Specific Subscriptions**: Subscribe to specific events rather than wildcards when possible

## Complete Example

```typescript
import { 
  registerToHook, 
  getSdkForTenant,
  ResponseError 
} from '@qelos/plugin-play';

// Subscribe to order creation
registerToHook({
  eventName: 'order.created'
}, async (request, reply) => {
  const { data, tenant } = request.body;
  const { order } = data;
  
  try {
    // Validate order
    if (!order.items || order.items.length === 0) {
      throw new ResponseError('Order has no items', 400);
    }
    
    // Get SDK for tenant
    const sdk = await getSdkForTenant(tenant);
    
    // Create order record in blueprint
    const orderEntity = await sdk.blueprints
      .entitiesOf('order')
      .create({
        identifier: order._id,
        metadata: {
          total: order.total,
          status: 'pending',
          items: order.items
        }
      });
    
    // Send confirmation email
    await sendOrderConfirmation(order);
    
    // Log success
    console.log('Order processed:', order._id);
    
    return {
      received: true,
      success: true,
      orderId: orderEntity.identifier
    };
    
  } catch (error) {
    console.error('Error processing order:', error);
    
    if (error instanceof ResponseError) {
      throw error;
    }
    
    reply.code(500);
    return {
      received: true,
      success: false,
      error: error.message
    };
  }
});
```

## Next Steps

- [Learn about endpoints](./endpoints.md)
- [Create micro-frontends](./micro-frontends.md)
- [Explore SDK integration](./sdk-integration.md)
- [See complete examples](./examples.md)
