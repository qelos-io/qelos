# Manage Lambdas

The Lambdas management module allows administrators to manage serverless functions in the Qelos platform.

These operations require administrator privileges and use the Qelos Administrator SDK.

## Initialization

```typescript
import QelosAdministratorSDK from '@qelos/sdk/administrator';

const sdk = new QelosAdministratorSDK({
    apiKey: 'admin-api-key',
    baseUrl: 'https://api.qelos.io'
});
```

## Lambda Operations

### Get a List of Lambdas

Retrieve all lambdas for a specific source.

```typescript
const lambdas = await sdk.manageLambdas.getList('sourceId');
console.log(lambdas);
```

### Get a Single Lambda

Retrieve details of a specific lambda function.

```typescript
const lambda = await sdk.manageLambdas.getLambda('sourceId', 'functionName');
console.log(lambda);
```

### Create a Lambda

Create a new lambda function.

```typescript
const newLambda = await sdk.manageLambdas.create('sourceId', {
    name: 'my-function',
    runtime: 'nodejs18.x',
    handler: 'index.handler',
    role: 'arn:aws:iam::123456789012:role/lambda-role',
    code: {
        ZipFile: 'base64-encoded-zip-file'
    },
    description: 'My lambda function',
    timeout: 30,
    memorySize: 128
});
```

### Update a Lambda

Update an existing lambda function's configuration or code.

```typescript
const updatedLambda = await sdk.manageLambdas.update('sourceId', 'functionName', {
    description: 'Updated description',
    timeout: 60,
    memorySize: 256
});
```

### Remove a Lambda

Delete a lambda function.

```typescript
await sdk.manageLambdas.remove('sourceId', 'functionName');
console.log('Lambda deleted successfully');
```

## Supported Providers

### AWS Lambda

When working with AWS Lambda functions, you can:

- Configure runtime (Node.js, Python, Java, etc.)
- Set memory and timeout limits
- Update function code
- Manage environment variables
- Configure VPC settings

```typescript
// Create AWS Lambda
const awsLambda = await sdk.manageLambdas.create('aws-source-id', {
    name: 'process-data',
    runtime: 'nodejs18.x',
    handler: 'index.handler',
    role: 'arn:aws:iam::123456789012:role/lambda-execution',
    code: {
        S3Bucket: 'my-bucket',
        S3Key: 'function.zip'
    },
    environment: {
        Variables: {
            API_URL: 'https://api.example.com',
            DEBUG: 'true'
        }
    }
});
```

### Cloudflare Workers

For Cloudflare Workers, you can:

- Deploy worker scripts
- Configure bindings
- Set up routes
- Manage worker settings

```typescript
// Create Cloudflare Worker
const worker = await sdk.manageLambdas.create('cloudflare-source-id', {
    name: 'api-proxy',
    content: 'export default { fetch() { return new Response("Hello!"); } }',
    bindings: [
        {
            type: 'kv_namespace',
            name: 'KV_NAMESPACE',
            namespace_id: 'namespace-id'
        }
    ]
});
```

## Best Practices for Managing Lambdas

1. **Version Control** - Keep your function code in version control
2. **Environment Variables** - Use environment variables for configuration
3. **Error Handling** - Implement proper error handling in your functions
4. **Monitoring** - Set up monitoring and logging
5. **Security** - Follow least privilege principle for IAM roles
6. **Testing** - Test functions in a staging environment before production

## Common Operations

### Batch Operations

```typescript
// Get all lambdas and update their memory
const lambdas = await sdk.manageLambdas.getList('sourceId');

for (const lambda of lambdas) {
    if (lambda.memorySize < 256) {
        await sdk.manageLambdas.update('sourceId', lambda.name, {
            memorySize: 256
        });
    }
}
```

### Environment Management

```typescript
// Update environment variables
await sdk.manageLambdas.update('sourceId', 'functionName', {
    environment: {
        Variables: {
            NEW_VAR: 'value',
            EXISTING_VAR: 'updated-value'
        }
    }
});
```

## Error Handling

```typescript
try {
    const lambda = await sdk.manageLambdas.getLambda('sourceId', 'functionName');
} catch (error) {
    if (error.status === 404) {
        console.log('Lambda not found');
    } else if (error.status === 403) {
        console.log('Access denied - check permissions');
    } else {
        console.error('Failed to get lambda:', error);
    }
}
```

## Related Documentation

- [Execute Lambdas and Webhooks](./execute_lambdas.md) - Learn how to trigger and execute lambdas
- [Integration Sources](../integration-sources.md) - Configure integration sources
- [Authentication](../authentication.md) - Handle authentication and authorization
