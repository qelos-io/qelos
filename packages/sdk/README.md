# @qelos/sdk

SDK to use Qelos common API endpoints.

Can be used for both backend and frontend applications.

## Installation

```shell
npm install @qelos/sdk
```

## Usage

### Main SDK

```typescript
// my-sdk.ts
import QelosSDK from '@qelos/sdk';

const sdk = new QelosSDK({appUrl: 'https://yourdomain.com', fetch: window.fetch});
export default sdk;
```

### Administrator SDK

```typescript
import QelosAdministratorSDK from '@qelos/sdk/administrator';

const adminSdk = new QelosAdministratorSDK({
  appUrl: 'https://yourdomain.com',
  fetch: window.fetch
});
```

### Importing Types

```typescript
import { QelosSDKOptions } from '@qelos/sdk/types';
import { IWorkspace } from '@qelos/sdk/workspaces';
import { IAppConfiguration } from '@qelos/sdk/configurations';
import { ILayout, LayoutKind } from '@qelos/sdk/administrator/layouts';
```

**Note:** You can inject a fetch-like function, such as `node-fetch` or any fetch equivalent.

### Available Exports

- `@qelos/sdk` - Main SDK class
- `@qelos/sdk/administrator` - Administrator SDK
- `@qelos/sdk/administrator/*` - Administrator submodules (layouts, manage-configurations, etc.)
- `@qelos/sdk/workspaces` - Workspaces module and types
- `@qelos/sdk/configurations` - Configurations module and types
- `@qelos/sdk/types` - SDK types

### Backward Compatibility

For backward compatibility, the following imports still work:
- `@qelos/sdk/dist/*` - Direct dist imports
- `@qelos/sdk/src/*` - Direct source imports

However, it's recommended to use the clean import paths listed above.

**Note:** Clean import paths require TypeScript's `moduleResolution` to be set to `"node16"`, `"nodenext"`, or `"bundler"`. If you're using the legacy `"node"` module resolution, continue using the `/dist` paths.

### Basic usage of SDK instance:
```typescript jsx
// MyPostsList.tsx
import sdk from './my-sdk';

function MyPostsList() {
  const [posts, setPosts] = useState([]);
  const [querySearch, setQuery] = useState([]);
  useEffect(() => {
    sdk.posts.getList({q: querySearch, limit: 50});
  }, [querySearch]);

  return (
    <div>
      <input type="text" placeholder="Search posts" onChange={e => setQuery(e.target.value)}/>
      {
        posts.map(post => <PostItem post={post} key={post._id}/>)
      }
    </div>
  )
}
```

### Authentication

The `sdk.authentication` namespace exposes signin/signup, token refresh,
social-auth, and the current-user accessor.

```typescript
// Username + password
const { payload, headers } = await sdk.authentication.signin({
  username: 'jane',
  password: 'secret',
});
// headers['set-cookie'] — auth cookie issued by Qelos

// Refresh an access + refresh token pair (oauth-style)
await sdk.authentication.refreshToken();

// Refresh a cookie-token session (used by integrator-hosted apps that keep
// the user signed in via an HttpOnly cookie). Returns the rotated cookie
// and the refreshed user — forward `set-cookie` to your downstream response.
const result = await sdk.authentication.refreshCookieToken();
// result.headers['set-cookie'] — new cookie value to forward
// result.payload.user           — refreshed user
// result.payload.cookieToken    — raw token (also embedded in set-cookie)
```

When a server-side host (`integrator-express`, `-next`, `-nuxt`, `-fastify`,
`-nest`) wraps the SDK, `refreshCookieToken()` is called automatically on
expired cookie-only sessions and the rotated cookie is written back to the
outbound response. Call it directly only when you need to refresh
proactively — e.g. before handing the session off to another service.

#### MCP client OAuth (Cursor, Claude, remote MCP)

External MCP clients use Qelos as an OAuth authorization server. The SDK
helpers build authorize URLs, parse callback query parameters, and exchange
PKCE authorization codes — without reimplementing URL construction or token
requests.

Tenant admins must enable MCP OAuth and list client callback URLs in
`mcp-configuration.metadata.permittedCallbackUrls`.

```typescript
import QelosSDK, {
  buildMcpAuthorizePath,
  parseMcpCallbackParams,
} from '@qelos/sdk';
import { createHash, randomBytes } from 'node:crypto';

const sdk = new QelosSDK({ appUrl: 'https://your-tenant.qelos.app' });

// PKCE (required for authorization-code delivery to MCP clients)
const codeVerifier = randomBytes(32).toString('base64url');
const codeChallenge = createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

const redirectUri = 'cursor://anysphere.cursor-mcp/oauth/callback';

// 1) Send the user to Qelos authorize (browser or MCP client opens this URL)
const authorizeUrl = sdk.authentication.getMcpAuthorizeUrl({
  redirectUri,
  state: 'optional-csrf-state',
  codeChallenge,
  codeChallengeMethod: 'S256',
});

// Relative path only (e.g. for login redirect resume):
const authorizePath = buildMcpAuthorizePath({
  redirectUri,
  codeChallenge,
  codeChallengeMethod: 'S256',
});

// 2) On your callback route, parse ?code=…&state=… (or ?error=…)
const params = parseMcpCallbackParams(req.url); // Express: req.url; Next.js: req.url

if (params.error) {
  throw new Error(params.error);
}

// 3) Exchange the authorization code for OAuth tokens + user profile
const { accessToken, refreshToken, user } =
  await sdk.authentication.exchangeMcpAuthorizationCode({
    code: params.code!,
    redirectUri,
    codeVerifier,
  });
```

Claude remote MCP uses `https://claude.ai/api/mcp/auth_callback` as
`redirectUri`; Cursor uses `cursor://anysphere.cursor-mcp/oauth/callback`.
Both must appear in the tenant permitted callback list.

Enjoy!
