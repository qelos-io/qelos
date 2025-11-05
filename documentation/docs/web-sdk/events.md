---
title: Event Communication
---

# {{ $frontmatter.title }}

Documentation coming soon.

The Web SDK provides a bidirectional event system for communication between your micro-frontend and the host Qelos application.

## Sending Events

```typescript
import { dispatch } from '@qelos/web-sdk';

dispatch('myEvent', { data: 'value' });
```

## Receiving Events

```typescript
import { on } from '@qelos/web-sdk';

on('hostEvent', (payload) => {
  console.log('Received event:', payload);
});
```
