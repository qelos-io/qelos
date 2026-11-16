---
title: Managing Scripts & Components
---
# Managing Scripts & Components

> **API Reference:** See the [Scripts & Components API](/api/scripts) for the raw HTTP endpoints.

This section covers how to publish and manage **scripts** (TypeScript / JavaScript modules) and **Vue components** with the Qelos SDK. Both are compiled when saved and served by Qelos; components can import scripts with relative paths. See the [Components & Scripts guide](/getting-started/components-and-scripts) for the concepts.

**Note**: This module is only available through the administrator SDK (`QelosAdminSDK`).

```typescript
import QelosAdminSDK from '@qelos/sdk/administrator';

const sdkAdmin = new QelosAdminSDK({ appUrl: 'https://your-instance.com' });
```

::: warning `sdkAdmin.components` is deprecated
`sdkAdmin.components` still works, but `sdkAdmin.scripts` replaces it and manages both components and scripts.
:::

## Items

Every item has a `type` (`"script"` or `"component"`) and an `identifier`, which is its path (`utils/format-price`, `products/ProductCard`).

```typescript
interface IScript {
  _id?: string;
  type: 'script' | 'component';
  identifier: string;        // path, without extension
  componentName?: string;    // components only
  description?: string;
  content: string;           // the source
  requiredProps?: { prop: string; type: string }[]; // components only
  created: Date;
  updated: Date;
}
```

## Listing

```typescript
const all = await sdkAdmin.scripts.getList();
const scripts = await sdkAdmin.scripts.getList('script');
const components = await sdkAdmin.scripts.getList('component');
```

The list does not include `content`. Use `getScript` to read the source.

## Reading

```typescript
const script = await sdkAdmin.scripts.getScript(id);
console.log(script.content);
```

## Creating

`type` is inferred when omitted: an item with a `componentName` (or a `.vue` identifier) is a component, anything else is a script.

```typescript
// a script
await sdkAdmin.scripts.create({
  identifier: 'utils/format-price',
  description: 'Formats prices',
  content: `export const formatPrice = (value: number) => '$' + value.toFixed(2);`,
});

// a component that imports it
await sdkAdmin.scripts.create({
  identifier: 'products/ProductCard',
  componentName: 'ProductCard',
  content: `
<template><div>{{ formatPrice(price) }}</div></template>
<script setup lang="ts">
import { formatPrice } from '../utils/format-price.ts';
defineProps<{ price: number }>();
</script>`,
});
```

If the source doesn't compile, the call rejects. The server's response includes a `reason` with the compile message and the line of the problem, and nothing is saved.

## Updating

```typescript
await sdkAdmin.scripts.update(id, {
  content: `export const formatPrice = (value: number) => '€' + value.toFixed(2);`,
});
```

Components that import the script pick up the new version automatically, without being recompiled.

## Removing

```typescript
await sdkAdmin.scripts.remove(id);
```

## Bulk

Create or update many items at once. Scripts are processed before components, so a component can import a script from the same batch.

```typescript
const result = await sdkAdmin.scripts.bulkCreateOrUpdate([
  { identifier: 'utils/format-price', content: '...' },
  { identifier: 'products/ProductCard', componentName: 'ProductCard', content: '...' },
]);

console.log(`${result.succeeded} succeeded, ${result.failed} failed`);
for (const item of result.results.filter(r => !r.success)) {
  console.error(item.identifier, item.error);
}
```
