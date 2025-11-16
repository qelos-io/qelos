# SDK Import Migration Guide

The `@qelos/sdk` package now supports cleaner imports while maintaining backward compatibility.

## New Clean Imports (Recommended)

```typescript
// Main SDK
import QelosSDK from '@qelos/sdk';

// Administrator SDK
import QelosAdministratorSDK from '@qelos/sdk/administrator';

// Types
import { QelosSDKOptions } from '@qelos/sdk/types';
import { IWorkspace } from '@qelos/sdk/workspaces';
import { IAppConfiguration } from '@qelos/sdk/configurations';

// Administrator submodules
import { ILayout, LayoutKind } from '@qelos/sdk/administrator/layouts';
import { ICustomConfiguration } from '@qelos/sdk/administrator/manage-configurations';
```

## Old Imports (Still Supported for Backward Compatibility)

```typescript
// These still work but are not recommended
import QelosAdministratorSDK from '@qelos/sdk/dist/administrator';
import QelosAdministratorSDK from '@qelos/sdk/src/administrator';
import { IWorkspace } from '@qelos/sdk/dist/workspaces';
import { QelosSDKOptions } from '@qelos/sdk/dist/types';
```

## Migration Examples

### Before
```typescript
import QelosAdministratorSDK from '@qelos/sdk/dist/administrator';
import { IWorkspace } from '@qelos/sdk/dist/workspaces';
import { QelosSDKOptions } from '@qelos/sdk/dist/types';
```

### After
```typescript
import QelosAdministratorSDK from '@qelos/sdk/administrator';
import { IWorkspace } from '@qelos/sdk/workspaces';
import { QelosSDKOptions } from '@qelos/sdk/types';
```

## Available Exports

- `@qelos/sdk` - Main SDK class
- `@qelos/sdk/administrator` - Administrator SDK
- `@qelos/sdk/administrator/*` - All administrator submodules (layouts, manage-configurations, etc.)
- `@qelos/sdk/workspaces` - Workspaces module and types
- `@qelos/sdk/configurations` - Configurations module and types
- `@qelos/sdk/types` - SDK types
- `@qelos/sdk/src/*` - Direct source imports (backward compatibility)
- `@qelos/sdk/dist/*` - Direct dist imports (backward compatibility)

## TypeScript Configuration Requirements

To use the clean import paths (without `/dist` or `/src`), your TypeScript configuration must use one of the modern module resolution strategies:

```json
{
  "compilerOptions": {
    "moduleResolution": "node16"  // or "nodenext" or "bundler"
  }
}
```

If your project uses `"moduleResolution": "node"` (the legacy default), you should continue using the backward-compatible paths (`@qelos/sdk/dist/*`) until you can upgrade your TypeScript configuration.

## Benefits

1. **Cleaner imports** - No need to specify `/dist` or `/src`
2. **Better IDE support** - Proper TypeScript resolution
3. **Backward compatible** - Old imports continue to work
4. **Future-proof** - Standard package exports pattern
