---
title: Scripts & Components API
editLink: true
---
# Scripts & Components API

Endpoints for managing the code you publish to your application: **scripts** (TypeScript / JavaScript modules) and **Vue components**. Both are compiled when you save them and served from `/api/static`.

> **SDK equivalent:** [`sdkAdmin.scripts`](/sdk/managing_scripts) · **Guide:** [Components & Scripts](/getting-started/components-and-scripts)

All management endpoints require an authenticated user (or API token) with permission to edit the application. Every item has a `type` of `"script"` or `"component"`.

::: warning `/api/components` is deprecated
`/api/components` keeps working for older SDKs and CLIs, and responds with `Deprecation: true` and a `Link` header pointing to `/api/scripts`. Use `/api/scripts` for new code: it manages both components and scripts.
:::

## Identifiers

An item's `identifier` is its path, for example `utils/format-price` or `products/ProductCard`. File extensions are ignored (`utils/format-price.ts` is stored as `utils/format-price`). Each path segment may contain letters, numbers and hyphens. See [Components & Scripts](/getting-started/components-and-scripts#identifiers-are-paths).

## List

```
GET /api/scripts
```

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `type` | `string` | Optional. `script` or `component` |

### Response

An array of items **without** their source and compiled code:

```json
[
  { "_id": "64f...", "type": "script", "identifier": "utils/format-price", "description": "Formats prices" },
  { "_id": "64f...", "type": "component", "identifier": "products/ProductCard", "componentName": "ProductCard", "requiredProps": [] }
]
```

> **SDK:** [`sdkAdmin.scripts.getList(type?)`](/sdk/managing_scripts#listing)

---

## Get

```
GET /api/scripts/{id}
```

Returns the item including its `content` (the source you saved). The same `id` space covers scripts and components.

> **SDK:** [`sdkAdmin.scripts.getScript(id)`](/sdk/managing_scripts#reading)

---

## Create

```
POST /api/scripts
```

### Request Body

```json
{
  "identifier": "utils/format-price",
  "description": "Formats prices",
  "content": "export const formatPrice = (value: number) => `$${value.toFixed(2)}`;"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `identifier` | `string` | Yes | The path of the item |
| `content` | `string` | Yes | TypeScript/JavaScript source, or a `.vue` single-file component |
| `type` | `string` | No | `script` or `component`. Inferred when omitted: an item with a `componentName`, or an identifier ending with `.vue`, is a component; anything else is a script |
| `componentName` | `string` | Components | The name the component is registered under |
| `description` | `string` | No | What it is for |

### Response

Returns the created item with its generated `_id` and `type`.

### Errors

| Status | Body | Meaning |
|---|---|---|
| `400` | `{ "message": "failed to compile a script", "reason": "..." }` | The source did not compile. `reason` holds the message and the problematic line. Nothing is saved |
| `400` | `{ "message": "failed to create a script", "reason": "script identifier already exists" }` | The identifier is taken |

> **SDK:** [`sdkAdmin.scripts.create(item)`](/sdk/managing_scripts#creating)

---

## Update

```
PUT /api/scripts/{id}
```

Send only what changes. Changing `content` recompiles the item. The `type` of an item cannot change.

```json
{ "content": "export const formatPrice = (value: number) => value.toFixed(2);" }
```

> **SDK:** [`sdkAdmin.scripts.update(id, changes)`](/sdk/managing_scripts#updating)

---

## Delete

```
DELETE /api/scripts/{id}
```

> **SDK:** [`sdkAdmin.scripts.remove(id)`](/sdk/managing_scripts#removing)

---

## Bulk Create or Update

Create or update many items in one request. Items are matched by `identifier`; unchanged content is not recompiled.

```
POST /api/scripts/bulk
```

```json
{
  "items": [
    { "identifier": "utils/format-price", "content": "export const formatPrice = ..." },
    { "identifier": "products/ProductCard", "componentName": "ProductCard", "content": "<template>...</template>" }
  ]
}
```

`{ "scripts": [...] }` and `{ "components": [...] }` arrays are accepted as well.

**Scripts are processed before components**, so a component in the same request can import a script that is created by it.

### Response

```json
{
  "total": 2,
  "succeeded": 2,
  "failed": 0,
  "results": [
    { "type": "script", "identifier": "utils/format-price", "success": true },
    { "type": "component", "identifier": "products/ProductCard", "success": true }
  ]
}
```

A failed item has `"success": false` and an `error` message; the other items are still saved.

> **SDK:** [`sdkAdmin.scripts.bulkCreateOrUpdate(items)`](/sdk/managing_scripts#bulk)

---

## Serving compiled code

These endpoints are public (no authentication) and are what the browser loads.

### Scripts

```
GET /api/static/scripts/{identifier}.js
```

Returns the compiled, minified ES module. The URL is **stable**: it does not change when the script is updated. It is served with `Cache-Control: no-cache` and an `ETag`, so browsers revalidate and get `304 Not Modified` while the script is unchanged.

Components and other scripts import it from this URL automatically; you rarely need to use it directly.

### Components

```
GET /api/static
GET /api/static/{identifier}.{updated}.js
GET /api/static/{identifier}.{updated}.css
```

`GET /api/static` lists the components with the versioned URLs of their JS and CSS. The version in the URL changes when a component is updated, so these responses can be cached for a long time.
