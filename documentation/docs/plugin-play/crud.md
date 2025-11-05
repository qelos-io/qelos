---
title: CRUD Operations
---

# {{ $frontmatter.title }}

Documentation coming soon.

Learn how to create auto-generated CRUD APIs for your data models.

## Creating a CRUD

```typescript
import { createCrud } from '@qelos/plugin-play';

createCrud({
  name: 'Product',
  schema: {
    name: { type: String, public: true },
    price: { type: Number, public: true }
  }
});
```
