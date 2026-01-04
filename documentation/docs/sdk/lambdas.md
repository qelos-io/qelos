# Lambdas

The Lambdas module allows you to manage and execute serverless functions.

## Manage Lambdas (Admin)

These operations require administrator privileges.

### Get a list of lambdas
```typescript
import QelosAdministratorSDK from '@qelos/sdk/administrator';

const sdk = new QelosAdministratorSDK({
    // ...
});

const lambdas = await sdk.manageLambdas.getList('sourceId');
```

### Get a lambda
```typescript
import QelosAdministratorSDK from '@qelos/sdk/administrator';

const sdk = new QelosAdministratorSDK({
    // ...
});

const lambda = await sdk.manageLambdas.getLambda('sourceId', 'functionName');
```

### Create a lambda
```typescript
import QelosAdministratorSDK from '@qelos/sdk/administrator';

const sdk = new QelosAdministratorSDK({
    // ...
});

const newLambda = await sdk.manageLambdas.create('sourceId', {
    // ...
});
```

### Update a lambda
```typescript
import QelosAdministratorSDK from '@qelos/sdk/administrator';

const sdk = new QelosAdministratorSDK({
    // ...
});

const updatedLambda = await sdk.manageLambdas.update('sourceId', 'functionName', {
    // ...
});
```

### Delete a lambda
```typescript
import QelosAdministratorSDK from '@qelos/sdk/administrator';

const sdk = new QelosAdministratorSDK({
    // ...
});

await sdk.manageLambdas.delete('sourceId', 'functionName');
```

## Execute a lambda

### Execute a lambda
```typescript
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({
    // ...
});

const result = await sdk.lambdas.execute('sourceId', 'functionName', {
    // ...
});
```
