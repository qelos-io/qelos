---
title: TypeScript Types Reference
---
# TypeScript Types Reference

This reference guide provides detailed information about the TypeScript types used in the Qelos SDK. Understanding these types will help you write more robust code with better IDE support and fewer runtime errors.

## Core SDK Types

### QelosSDKOptions

Options used when initializing the SDK:

```typescript
interface QelosSDKOptions {
  /**
   * The base URL of your Qelos application
   */
  appUrl: string;
  
  /**
   * Optional callback triggered when token refresh fails
   */
  onFailedRefreshToken?: () => Promise<string | null | undefined>;
  
  /**
   * Optional function to provide extra headers for API requests
   */
  extraHeaders?: (url: string, isRetry?: boolean) => Promise<Record<string, string>>;
  
  /**
   * Optional function to provide extra query parameters for API requests
   */
  extraQueryParams?: (url: string) => Record<string, string>;
  
  /**
   * Whether to enable automatic token refresh (default: false)
   */
  forceRefresh?: boolean;
}
```

### API Request Options

Options that can be passed to API calls:

```typescript
interface ApiRequestOptions {
  /**
   * HTTP method for the request (default: 'get')
   */
  method?: 'get' | 'post' | 'put' | 'delete' | 'patch';
  
  /**
   * Request headers
   */
  headers?: Record<string, string>;
  
  /**
   * Request body (for POST, PUT, PATCH requests)
   */
  body?: any;
  
  /**
   * Query parameters
   */
  query?: Record<string, any>;
  
  /**
   * Whether to enable automatic token refresh for this request (default: false)
   */
  forceRefresh?: boolean;
}
```

### Authentication Types

Types related to authentication:

```typescript
interface SignInCredentials {
  /**
   * User's email or username
   */
  username: string;
  
  /**
   * User's password
   */
  password: string;
}

interface OAuthTokens {
  /**
   * Access token for API authentication
   */
  token: string;
  
  /**
   * Refresh token for obtaining new access tokens
   */
  refreshToken: string;
  
  /**
   * Additional user information
   */
  payload: UserPayload;
}

interface UserPayload {
  /**
   * User ID
   */
  id: string;
  
  /**
   * User's email
   */
  email: string;
  
  /**
   * User's display name
   */
  name: string;
  
  /**
   * User's roles
   */
  roles: string[];
  
  /**
   * Additional user metadata
   */
  [key: string]: any;
}
```

## Working with Generic Types

The SDK uses generic types to provide type safety for API responses:

### Using Generic Response Types

```typescript
// Specify the expected response type
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

// The response will be typed as User[]
const users = await sdk.callJsonApi<User[]>('/api/users');

// TypeScript now knows that users is an array of User objects
users.forEach(user => {
  console.log(user.name); // TypeScript knows that user has a name property
});
```

### Defining Custom Types

You can define your own types to match your API responses:

```typescript
// Define a custom type for a blueprint
interface Blueprint {
  id: string;
  name: string;
  description: string;
  version: string;
  fields: {
    id: string;
    name: string;
    type: string;
    required: boolean;
    options?: any;
  }[];
  createdAt: string;
  updatedAt: string;
}

// Use the custom type with the SDK
const blueprint = await sdk.callJsonApi<Blueprint>(`/api/blueprints/${blueprintId}`);

// TypeScript now provides autocomplete and type checking
console.log(blueprint.name);
console.log(blueprint.fields.length);
blueprint.fields.forEach(field => {
  console.log(`${field.name} (${field.type}): ${field.required ? 'Required' : 'Optional'}`);
});
```

## Type Guards and Assertions

Type guards help you narrow down types at runtime:

```typescript
// Type guard function to check if an object is a User
function isUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.email === 'string'
  );
}

// Usage with the SDK
try {
  const response = await sdk.authentication.getLoggedInUser();
  
  if (isUser(response)) {
    // TypeScript knows response is a User here
    console.log(response.name);
  } else {
    console.error('Response is not a valid user');
  }
} catch (error) {
  console.error('API call failed', error);
}
```

## Best Practices for TypeScript

1. **Always specify response types** when calling API methods to get better type checking and autocomplete.

2. **Create interfaces** for your API responses to ensure type safety throughout your application.

3. **Use type guards** to handle cases where the response type might vary.

4. **Leverage IDE features** like autocomplete and type checking to catch errors early.

5. **Document your types** with JSDoc comments to provide better hints in your IDE.

6. **Use strict TypeScript settings** in your tsconfig.json to catch more potential issues:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

## Conclusion

Understanding and utilizing TypeScript types in the Qelos SDK will help you write more robust code with fewer runtime errors. The SDK's type system is designed to provide helpful autocomplete suggestions and catch potential issues at compile time rather than runtime.
