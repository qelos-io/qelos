# Execute Lambdas and Webhooks

The Qelos Lambdas SDK provides methods to interact with webhook integrations in the Qelos platform. This SDK allows you to trigger webhooks and execute integration targets.

## Initialization

```typescript
import { QelosSDK } from '@qelos/sdk';

const sdk = new QelosSDK({ 
  apiKey: 'your-api-key', 
  baseUrl: 'https://api.qelos.io' 
});
const lambdas = sdk.lambdas;
```

## Execute a Webhook Integration

Execute a webhook integration with custom request options.

```typescript
const result = await sdk.lambdas.execute('integration-123', {
  method: 'POST',
  headers: { 'X-Custom': 'value' },
  body: JSON.stringify({ key: 'value' })
});
```

## HTTP Methods

The SDK provides convenience methods for different HTTP verbs:

### POST Request

```typescript
const result = await sdk.lambdas.post('integration-id', {
  body: { message: 'Hello', value: 42 }
});
```

### GET Request

```typescript
const result = await sdk.lambdas.get('integration-id');
```

### PUT Request

```typescript
const result = await sdk.lambdas.put('integration-id', {
  body: { update: 'data' }
});
```

### DELETE Request

```typescript
const result = await sdk.lambdas.delete('integration-id');
```

## Complete Example

```typescript
import { QelosSDK } from '@qelos/sdk';

const sdk = new QelosSDK({ 
  apiKey: process.env.QELOS_API_KEY,
  baseUrl: 'https://api.qelos.io'
});

// Trigger a webhook with POST data
const response = await sdk.lambdas.post('webhook-integration-id', {
  body: {
    event: 'user.created',
    userId: '12345',
    email: 'user@example.com'
  }
});

console.log('Webhook response:', response);
```

## Error Handling

```typescript
try {
  const result = await sdk.lambdas.post('integration-id', {
    body: { test: 'data' }
  });
  console.log('Success:', result);
} catch (error) {
  console.error('Webhook failed:', error);
  // Handle error appropriately
}
```

## Supported Integration Types

The Lambdas SDK can trigger various types of integrations configured in Qelos:

- **HTTP/Webhook endpoints** - Send HTTP requests to external services
- **AWS Lambda functions** - Invoke AWS Lambda functions
- **Cloudflare Workers** - Execute Cloudflare Worker scripts
- **Email services** - Send emails via configured providers
- **AI services** - Interact with AI models (OpenAI, Anthropic, etc.)
- **Custom integrations** - Any custom integration type supported by Qelos

## Response Format

The response from webhook executions varies based on the integration type:

```typescript
// HTTP/Webhook response
{
  status: 200,
  data: { ... },
  headers: { ... }
}

// AWS Lambda response
{
  statusCode: 200,
  body: { ... },
  logResult: "..."
}

// Cloudflare Worker response
{
  success: true,
  data: { ... }
}
```

## Advanced Usage

### Custom Request Headers

```typescript
// Execute with custom headers and method
const response = await sdk.lambdas.execute('integration-id', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'X-Custom-Header': 'custom-value'
  },
  body: JSON.stringify({ data: 'payload' })
});
```

### Query Parameters

```typescript
// Include query parameters in the URL
const response = await sdk.lambdas.get('integration-id', {
  headers: {
    'Accept': 'application/json'
  }
});
// Note: Query parameters should be encoded in the integration URL itself
```

## Best Practices

1. **Always handle errors** - Wrap calls in try-catch blocks
2. **Validate integration IDs** - Ensure the integration exists before calling
3. **Use appropriate HTTP methods** - Match the method to the action (GET for data, POST for creation)
4. **Handle timeouts** - Set appropriate timeout values for long-running operations
5. **Secure API keys** - Store API keys securely, never expose them in client-side code

## Rate Limits

Be aware of any rate limits imposed by:
- The Qelos platform API
- The target integration (e.g., AWS Lambda concurrency limits)
- Downstream services

Implement retry logic with exponential backoff for resilient integrations.

## Integration-Specific Examples

### AWS Lambda

```typescript
// Invoke AWS Lambda function
const result = await sdk.lambdas.post('aws-lambda-integration', {
  body: {
    action: 'process',
    data: { id: 123, value: 'test' }
  }
});
```

### Cloudflare Worker

```typescript
// Execute Cloudflare Worker
const result = await sdk.lambdas.post('cloudflare-worker-integration', {
  body: {
    method: 'GET',
    url: 'https://api.example.com/data'
  }
});
```

### Email Service

```typescript
// Send email via integration
const result = await sdk.lambdas.post('email-integration', {
  body: {
    to: 'user@example.com',
    subject: 'Welcome!',
    template: 'welcome-email'
  }
});
```

### AI Service

```typescript
// Call AI service integration
const result = await sdk.lambdas.post('ai-integration', {
  body: {
    prompt: 'Summarize this text',
    model: 'gpt-4',
    max_tokens: 100
  }
});
```
