---
title: Micro-Frontends
---

# {{ $frontmatter.title }}

Documentation coming soon.

Learn how to register micro-frontends (UI components) in your plugin.

## Adding a Micro-Frontend

```typescript
import { addMicroFrontend } from '@qelos/plugin-play';

addMicroFrontend({
  name: 'My Component',
  description: 'A custom UI component',
  url: 'https://my-plugin.com/component',
  route: {
    name: 'my-route',
    path: '/my-route',
    navBarPosition: 'top'
  }
});
```
