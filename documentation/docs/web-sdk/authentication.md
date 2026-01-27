---
title: Authentication
---
# Authentication

The Web SDK provides a complete authentication system for micro-frontends running inside Qelos applications.

## Overview

Authentication in the Web SDK works through a session-based system where each iframe instance receives a unique `code` that identifies the session. This code is used to authenticate and authorize the micro-frontend.

## Session Code

The session code is automatically extracted from the URL parameters when your micro-frontend loads:

```typescript
import { code } from '@qelos/web-sdk';

console.log('Current session code:', code);
// Output: Current session code: abc123xyz
```

### Default Code

If your micro-frontend is loaded outside of a Qelos host (e.g., during development), the code defaults to `'default'`:

```typescript
import { code } from '@qelos/web-sdk';

if (code === 'default') {
  console.log('Running in standalone mode');
} else {
  console.log('Running inside Qelos host');
}
```

## Authorization

### authorize()

The `authorize()` function authenticates your micro-frontend session and retrieves user data:

```typescript
import { authorize } from '@qelos/web-sdk';

const userData = await authorize();

console.log('User:', userData.user);
console.log('Workspace:', userData.workspace);
console.log('Tenant:', userData.tenant);
```

#### Response Structure

```typescript
interface AuthorizeResponse {
  user: {
    _id: string;
    username: string;
    email: string;
    fullName: string;
    firstName: string;
    lastName: string;
    roles: string[];
    metadata: any;
  };
  workspace: {
    _id: string;
    name: string;
    logo?: string;
    labels: string[];
  };
  tenant: string;
  token: string;
}
```

### Example: Complete Authorization Flow

```typescript
import { authorize, code } from '@qelos/web-sdk';

async function initializeApp() {
  try {
    console.log('Authorizing with code:', code);
    
    const data = await authorize();
    
    // User is authenticated
    console.log('Authenticated as:', data.user.fullName);
    console.log('Workspace:', data.workspace.name);
    
    // Store user data in your app state
    return data;
    
  } catch (error) {
    console.error('Authorization failed:', error);
    // Handle authorization failure
    throw error;
  }
}

// Call on app initialization
initializeApp();
```

## Re-Authorization

### reAuthorize()

If the user's session expires or needs to be refreshed, you can trigger re-authorization:

```typescript
import { reAuthorize } from '@qelos/web-sdk';

// Trigger re-authorization flow
reAuthorize();
```

This will:
1. Dispatch a re-authorization event to the host
2. The host will handle the authentication
3. Your micro-frontend will receive updated credentials

### onReAuthorize()

Listen for re-authorization events to update your application state:

```typescript
import { onReAuthorize } from '@qelos/web-sdk';

onReAuthorize((newData) => {
  console.log('Re-authorized with new data:', newData);
  
  // Update your application state
  updateUserData(newData);
});
```

## Un-Authorization

### unAuthorize()

Clean up the session when the user leaves or the micro-frontend unmounts:

```typescript
import { unAuthorize } from '@qelos/web-sdk';

// Clean up session
await unAuthorize();
```

The SDK automatically calls `unAuthorize()` when:
- The page is about to unload (`beforeunload` event)
- The host sends a `shutdown` event

### Manual Cleanup

For single-page applications, you may want to manually clean up:

```typescript
import { unAuthorize } from '@qelos/web-sdk';

// React example
useEffect(() => {
  return () => {
    // Cleanup on component unmount
    unAuthorize();
  };
}, []);
```

```typescript
// Vue example
onBeforeUnmount(() => {
  unAuthorize();
});
```

## Token Management

The authorization token is included in the response from `authorize()`:

```typescript
const { token } = await authorize();

// Use the token for API requests
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Token in URL

The token is also available as a URL parameter when your micro-frontend first loads:

```typescript
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
```

## Backend Integration

Your micro-frontend backend should implement the `/api/authorize` endpoint:

```typescript
// Example Express.js endpoint
app.post('/api/authorize', async (req, res) => {
  const { returnUrl, token } = req.body;
  const code = req.headers.code;
  
  try {
    // Verify token with Qelos
    const userData = await verifyWithQelos(token, code);
    
    // Store session
    await storeSession(code, userData);
    
    res.json(userData);
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

### Un-Authorize Endpoint

Implement the cleanup endpoint:

```typescript
app.post('/api/un-authorize', async (req, res) => {
  const code = req.headers.code;
  
  // Clean up session
  await removeSession(code);
  
  res.json({ success: true });
});
```

## Security Best Practices

1. **Always validate the token** on your backend
2. **Use HTTPS** for all communications
3. **Set appropriate CORS headers** to restrict access
4. **Implement session timeouts** to expire old sessions
5. **Clean up sessions** when users leave

## Error Handling

```typescript
import { authorize } from '@qelos/web-sdk';

try {
  const userData = await authorize();
  // Success
} catch (error) {
  if (error.status === 401) {
    // Unauthorized - invalid token or code
    console.error('Authentication failed');
  } else if (error.status === 403) {
    // Forbidden - user doesn't have access
    console.error('Access denied');
  } else {
    // Other errors
    console.error('Authorization error:', error);
  }
}
```

## Complete Example

```typescript
import { authorize, unAuthorize, onReAuthorize, code } from '@qelos/web-sdk';

class AuthService {
  private userData: any = null;

  async initialize() {
    console.log('Initializing with code:', code);
    
    // Initial authorization
    this.userData = await authorize();
    
    // Listen for re-authorization
    onReAuthorize((newData) => {
      this.userData = newData;
      this.onUserDataChanged(newData);
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      unAuthorize();
    });
    
    return this.userData;
  }

  getUser() {
    return this.userData?.user;
  }

  getWorkspace() {
    return this.userData?.workspace;
  }

  getToken() {
    return this.userData?.token;
  }

  private onUserDataChanged(newData: any) {
    // Notify your application of user data changes
    console.log('User data updated:', newData);
  }
}

// Usage
const authService = new AuthService();
await authService.initialize();
```

## Next Steps

- [Learn about event communication](./events.md)
- [Explore router integration](./router.md)
- [See complete examples](./examples.md)
