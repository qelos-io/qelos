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

Enjoy!
