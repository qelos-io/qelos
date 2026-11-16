---
title: Components & Scripts
editLink: true
---
# Components & Scripts

Qelos lets you publish your own code to your application: **Vue components** (`.vue`) and plain **scripts** (`.ts` / `.js`). Both are compiled and served by Qelos, so you can ship real, structured front-end code without a build pipeline of your own.

| | Component | Script |
|---|---|---|
| Source | `.vue` single-file component | `.ts` or `.js` ES module |
| Compiled to | a Vue component bundle (+ CSS) | a minified browser ES module |
| Used as | a tag, e.g. `<product-card></product-card>` | an import from components or other scripts |
| Served at | `/api/static/{identifier}.{version}.js` and `.css` | `/api/static/scripts/{identifier}.js` |

## Identifiers are paths

Every component and script has an **identifier**, and it is a path. Slashes are allowed, so you can organize your code in folders:

```
products/ProductCard      (component)
products/cards/PriceTag   (component)
utils/format-price        (script)
services/products-api     (script)
```

- A file's identifier is its path **without the extension**: `utils/format-price.ts` → `utils/format-price`.
- Use letters, numbers and hyphens in each path segment.
- The [admin panel](#in-the-admin-panel) shows these paths as folders.

## Importing a script

Components and scripts import a script with a relative path, exactly like in any project:

```ts
// utils/format-price.ts
export const formatPrice = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en', { style: 'currency', currency }).format(value);
```

```vue
<!-- products/ProductCard.vue -->
<template>
  <div class="card">{{ formatPrice(price) }}</div>
</template>

<script setup lang="ts">
import { formatPrice } from '../utils/format-price.ts';

defineProps<{ price: number }>();
</script>
```

Relative paths work like in a local project: they are resolved **from the folder of the file that imports**. `products/ProductCard.vue` reaches `utils/format-price.ts` with `../utils/format-price.ts`, while a component at the root uses `./utils/format-price.ts`. Because the CLI mirrors the same folder structure on disk, your editor resolves the imports too.

The import is resolved **at runtime** to the compiled script, so you don't bundle shared code into every component. Updating a script updates it everywhere it is used, without recompiling the components that import it.

Scripts can import other scripts the same way:

```ts
// services/products-api.ts
import { formatPrice } from '../utils/format-price.ts';
```

### What a script can import

- other scripts, with a **relative path** (`./`, `../`)
- the libraries Qelos already provides to the page: `vue`, `vue-router`, `element-plus`, `vue-i18n` and `@sdk`

Any other package (for example `lodash`) is **not** available. Importing one, or a path that goes above the root, fails with a compile error that tells you which import is the problem.

### Good to know

- A component imports a script only if that script **exists when the component is compiled**. If you create a script after a component that imports it, save the component again. Pushing with the CLI or the bulk API handles the order for you: scripts are processed before components.
- Only static `import ... from '...'` statements of scripts are resolved in components. Dynamic `import()` is not.
- Moving a component to another folder (changing its identifier) recompiles it, because its relative imports now start from a different folder.
- Compile errors are reported when you save, with the line of the problem. Nothing is published until it compiles.

## In the admin panel

The **Components** page browses your components by identifier path:

- folders are listed first, with the number of components inside, followed by the components of the current folder
- a breadcrumb takes you back up, and the current folder is part of the URL, so you can share it or reload the page
- searching looks through every folder and shows each match with its path
- creating a component while inside a folder starts its identifier with that folder

Identifiers accept slashes. A pasted `products/Card.vue` is saved as `products/Card`.

## From the command line

The `components` folder holds both kinds. [`qelos push components`](/cli/push#components-and-scripts) and [`qelos pull components`](/cli/pull#pull-components) work recursively with `.vue`, `.ts` and `.js` files:

```
components/
├── products/
│   ├── ProductCard.vue
│   └── cards/PriceTag.vue
└── utils/
    └── format-price.ts
```

```bash
qelos push components ./components
```

## From code

Use the administrator SDK ([`sdkAdmin.scripts`](/sdk/managing_scripts)) or the [Scripts API](/api/scripts) to create, update and push both components and scripts programmatically.

## AI agents

The Qelos AI agents that build pages know about scripts, so they can create reasonable, common structures for you without any knowledge of Qelos internals:

- `getComponents` / `searchComponents` list the components and scripts that already exist, as paths, optionally by type or folder
- `getScript` reads the source of any script or component, for example to learn what a script exports before importing it
- `createScript` creates a new TypeScript module (default folder `utils/`) and returns the import path to use
- `createComponent` creates a Vue component, optionally inside a folder, and imports the available scripts instead of inventing code
- `editComponent` edits any existing script or component by its path or name
