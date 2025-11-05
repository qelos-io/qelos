---
title: Configuration
---

# {{ $frontmatter.title }}

Documentation coming soon.

Learn how to configure your Plugin Play application with manifest options and configuration settings.

## Manifest Configuration

```typescript
import { configure } from '@qelos/plugin-play';

configure({
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Plugin description',
  manifestUrl: '/manifest.json',
  proxyPath: '/api/proxy'
}, {
  qelosUrl: process.env.QELOS_URL,
  qelosUsername: process.env.QELOS_USERNAME,
  qelosPassword: process.env.QELOS_PASSWORD
});
```
