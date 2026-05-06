---
title: Blueprint Entities API
editLink: true
---
# Blueprint Entities API

Endpoints for CRUD operations on blueprint entity data. Each blueprint defines a data model, and entities are the records within that model.

> **SDK equivalent:** [`sdk.blueprints.entitiesOf(blueprintKey)`](/sdk/blueprints_operations#working-with-blueprint-entities)

## Response Shape: Flat by Default

Blueprint entity endpoints return the **flat** shape by default — every metadata property is hoisted onto the top-level entity object alongside `identifier`, `created`, `updated`, `user`, `workspace`, and friends. The original `metadata` sub-object is preserved, so both `entity.foo` and `entity.metadata.foo` resolve to the same value.

To opt out and receive the wrapped shape (metadata only available under `entity.metadata`), pass `$flat=false` (or `$flat=0`) on the request.

### Migration Notes

- **Before:** entity responses were wrapped by default. Callers had to pass `$flat=true` (or `$flat=1`) to get the flat shape.
- **After:** entity responses are flat by default. Callers that explicitly relied on the wrapped shape must now pass `$flat=false`.
- The Qelos SDKs (`@qelos/sdk` and `qelos_sdk`) automatically send `$flat=true` when callers omit it, so the behavior is consistent across server versions. Existing call signatures keep working.
- Code that already passed `$flat=true` is unaffected.
- Code that read entity properties through the wrapped path (`entity.metadata.foo`) keeps working — the `metadata` object is still present in flat responses.

## List Entities

Retrieve a list of entities for a specific blueprint.

```
GET /api/blueprints/{blueprintKey}/entities
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blueprintKey` | `string` | The blueprint identifier |

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| `$limit` | `number` | Maximum number of results |
| `$skip` | `number` | Number of results to skip |
| `$sort` | `string` | Sort field (prefix with `-` for descending) |
| `$flat` | `boolean` | Return flat entity structure. **Default `true`** — pass `$flat=false` (or `0`) to receive the wrapped shape with metadata nested under `metadata`. |
| `$populate` | `boolean` | Populate related references |
| `$q` | `string` | Search string for metadata search |
| `$qProps` | `string` | Comma-separated metadata keys to search within |
| `$outerPopulate` | `string` | Populate related entities from other blueprints (format: `setKey:blueprintName:scope`) |
| `{field}` | `any` | Filter by exact field value |
| `{field}[$lt]` | `any` | Filter: less than |
| `{field}[$gt]` | `any` | Filter: greater than |
| `{field}[$lte]` | `any` | Filter: less than or equal |
| `{field}[$gte]` | `any` | Filter: greater than or equal |

### Response

```json
[
  {
    "_id": "entity-id",
    "name": "Product A",
    "price": 99.99,
    "category": "electronics",
    "created": "2025-01-01T00:00:00.000Z",
    "updated": "2025-01-15T00:00:00.000Z"
  }
]
```

### Example: Filtered Query

```
GET /api/blueprints/product/entities?$limit=10&$sort=-created&category=electronics&price[$lt]=100
```

### Example: Metadata Search

```
GET /api/blueprints/product/entities?$q=Premium&$qProps=name,description&$limit=20
```

### Example: Outer Population

```
GET /api/blueprints/product/entities?$outerPopulate=relatedOrders:orders:workspace
```

> **SDK:** [`sdk.blueprints.entitiesOf(blueprintKey).getList(query)`](/sdk/blueprints_operations#getting-a-list-of-entities)

---

## Get Entity

Retrieve a specific entity by its identifier.

```
GET /api/blueprints/{blueprintKey}/entities/{identifier}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blueprintKey` | `string` | The blueprint identifier |
| `identifier` | `string` | The entity ID |

### Response

Returns the entity object.

> **SDK:** [`sdk.blueprints.entitiesOf(blueprintKey).getEntity(identifier)`](/sdk/blueprints_operations#getting-a-specific-entity)

---

## Create Entity

Create a new entity within a blueprint.

```
POST /api/blueprints/{blueprintKey}/entities
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blueprintKey` | `string` | The blueprint identifier |

### Request Body

```json
{
  "name": "New Product",
  "price": 99.99,
  "category": "electronics"
}
```

The request body should contain the entity fields as defined by the blueprint schema.

### Response

Returns the created entity object with generated `_id`, `created`, and `updated` timestamps.

> **SDK:** [`sdk.blueprints.entitiesOf(blueprintKey).create(entity)`](/sdk/blueprints_operations#creating-a-new-entity)

---

## Update Entity

Update an existing entity.

```
PUT /api/blueprints/{blueprintKey}/entities/{identifier}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blueprintKey` | `string` | The blueprint identifier |
| `identifier` | `string` | The entity ID |

### Request Body

```json
{
  "price": 89.99,
  "inStock": true
}
```

Only the fields to be updated need to be included.

### Response

Returns the updated entity object.

> **SDK:** [`sdk.blueprints.entitiesOf(blueprintKey).update(identifier, changes)`](/sdk/blueprints_operations#updating-an-entity)

---

## Delete Entity

Remove an entity from a blueprint.

```
DELETE /api/blueprints/{blueprintKey}/entities/{identifier}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blueprintKey` | `string` | The blueprint identifier |
| `identifier` | `string` | The entity ID |

### Response

Returns `200 OK` on success.

> **SDK:** [`sdk.blueprints.entitiesOf(blueprintKey).remove(identifier)`](/sdk/blueprints_operations#removing-an-entity)
