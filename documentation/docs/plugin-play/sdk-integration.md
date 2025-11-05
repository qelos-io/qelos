---
title: SDK Integration
---

# {{ $frontmatter.title }}

Documentation coming soon.

Learn how to use the Qelos SDK within your plugin to make API calls.

## Getting the SDK

```typescript
import { getSdk, getSdkForTenant } from '@qelos/plugin-play';

// Get default SDK
const sdk = getSdk();

// Get SDK for specific tenant
const tenantSdk = await getSdkForTenant('tenant-id');
```
