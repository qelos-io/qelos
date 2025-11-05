---
title: Lifecycle Hooks
---

# {{ $frontmatter.title }}

Documentation coming soon.

Learn how to hook into the Plugin Play application lifecycle.

## Lifecycle Events

```typescript
import { on, LifecycleEvent } from '@qelos/plugin-play';

on(LifecycleEvent.beforeMount, ({ app }) => {
  console.log('App is about to mount');
});

on(LifecycleEvent.mounted, ({ app }) => {
  console.log('App has mounted');
});
```
