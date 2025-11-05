---
title: Router Integration
---

# {{ $frontmatter.title }}

Documentation coming soon.

The Web SDK provides router integration to navigate within the host application and respond to route changes.

## Changing Routes

```typescript
import { changeRoute } from '@qelos/web-sdk';

changeRoute('routeName', { param: 'value' });
```

## Listening to Route Changes

```typescript
import { onRouteChanged } from '@qelos/web-sdk';

onRouteChanged((route) => {
  console.log('Current route:', route);
});
```
