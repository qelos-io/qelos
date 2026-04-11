---
title: Blocks API
editLink: true
---
# Blocks API

Endpoints for managing content blocks. Blocks are reusable content components that can be used across your application.

> **SDK equivalent:** [`sdk.blocks`](/sdk/managing_blocks)

## List Blocks

Retrieve all available content blocks.

```
GET /api/blocks
```

### Response

```json
[
  {
    "_id": "block-id",
    "name": "Footer Content",
    "description": "Standard footer for all pages",
    "content": "<footer>...</footer>",
    "contentType": "html"
  }
]
```

> **SDK:** [`sdk.blocks.getList()`](/sdk/managing_blocks#getting-a-list-of-blocks)

---

## Get Block

Retrieve a specific block by its ID.

```
GET /api/blocks/{blockId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blockId` | `string` | The block ID |

### Response

Returns the block object.

> **SDK:** [`sdk.blocks.getBlock(blockId)`](/sdk/managing_blocks#getting-a-specific-block)

---

## Create Block

Create a new content block.

```
POST /api/blocks
```

### Request Body

```json
{
  "name": "Footer Content",
  "description": "Standard footer for all pages",
  "content": "<footer><p>&copy; 2025 My Company</p></footer>",
  "contentType": "html"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | The name of the block |
| `description` | `string` | No | Description of the block's purpose |
| `content` | `string` | Yes | The block content (HTML or text) |
| `contentType` | `string` | No | `"content"` (default) or `"html"` |

### Response

Returns the created block object with generated `_id`.

> **SDK:** [`sdk.blocks.create(block)`](/sdk/managing_blocks#creating-a-new-block)

---

## Update Block

Update an existing block.

```
PUT /api/blocks/{blockId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blockId` | `string` | The block ID |

### Request Body

```json
{
  "content": "<footer><p>&copy; 2025 My Company, Inc.</p></footer>",
  "description": "Updated footer content"
}
```

### Response

Returns the updated block object.

> **SDK:** [`sdk.blocks.update(blockId, changes)`](/sdk/managing_blocks#updating-a-block)

---

## Delete Block

Remove a content block.

```
DELETE /api/blocks/{blockId}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blockId` | `string` | The block ID |

### Response

Returns `200 OK` on success.

> **SDK:** [`sdk.blocks.remove(blockId)`](/sdk/managing_blocks#removing-a-block)
