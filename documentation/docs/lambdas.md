# Lambda/Serverless Functions

This document describes how to manage and execute Lambda/Serverless functions using the Qelos platform.

## Listing Functions

You can list all the functions for a given integration source.

```typescript
const functions = await qelos.administrator.lambdas.list('sourceId');
```

## Getting a Function

You can get a specific function by its name.

```typescript
const func = await qelos.administrator.lambdas.get('sourceId', 'functionName');
```

## Creating a Function

You can create a new function.

```typescript
const newFunc = await qelos.administrator.lambdas.create('sourceId', {
  name: 'my-new-function',
  runtime: 'nodejs18.x',
  description: 'My new function',
  // AWS specific
  handler: 'index.handler',
  role: 'arn:aws:iam::123456789012:role/lambda-role',
  zipFile: Buffer.from('...'),
  // Cloudflare specific
  code: 'export default { fetch: () => new Response("Hello World!") }',
});
```

## Updating a Function

You can update an existing function.

```typescript
const updatedFunc = await qelos.administrator.lambdas.update('sourceId', 'functionName', {
  description: 'My updated function',
});
```

## Deleting a Function

You can delete a function.

```typescript
await qelos.administrator.lambdas.delete('sourceId', 'functionName');
```

## Executing a Function

You can execute a function and get the result.

```typescript
const result = await qelos.lambdas.execute('sourceId', 'functionName', {
  foo: 'bar',
});
```
