---
title: Blueprints API
editLink: true
---
# Blueprints API

Endpoints for working with blueprint definitions (data models) and blueprint analytics. For CRUD operations on blueprint data (entities), see the [Blueprint Entities API](/api/blueprint-entities).

> **SDK equivalent:** [`sdk.blueprints`](/sdk/blueprints_operations)

## List Blueprints

Retrieve all blueprints available to the current user.

```
GET /api/blueprints
```

### Response

```json
[
  {
    "key": "product",
    "name": "Product",
    "description": "Product catalog blueprint",
    "fields": [
      { "key": "name", "type": "string", "required": true },
      { "key": "price", "type": "number", "required": true }
    ]
  }
]
```

> **SDK:** [`sdk.blueprints.getList()`](/sdk/blueprints_operations#get-list-of-all-blueprints)

---

## Get Blueprint

Retrieve a specific blueprint by its key.

```
GET /api/blueprints/{key}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `key` | `string` | The blueprint identifier |

### Response

Returns the blueprint object with its full field definitions.

> **SDK:** [`sdk.blueprints.getBlueprint(key)`](/sdk/blueprints_operations#get-a-specific-blueprint-by-key)

---

## Get Chart

Retrieve an ECharts-compatible chart configuration for a blueprint.

```
GET /api/blueprints/{blueprintKey}/charts/{chartType}
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blueprintKey` | `string` | The blueprint identifier |
| `chartType` | `string` | Chart type (e.g., `line`, `bar`) |

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `x` | `string` | Yes | The metadata key to aggregate |
| `$limit` | `number` | No | Limit the number of entities considered |
| `$skip` | `number` | No | Skip entities |

Additional filter parameters are supported (same as [entity listing](/api/blueprint-entities#list-entities)).

### Response

Returns an ECharts-compatible option object ready for rendering.

> **SDK:** [`sdk.blueprints.getChart(blueprintKey, chartType, query)`](/sdk/blueprints_operations#blueprint-charts--metrics)

---

## Get Pie Chart

Retrieve a pie chart configuration for a blueprint.

```
GET /api/blueprints/{blueprintKey}/charts/pie
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blueprintKey` | `string` | The blueprint identifier |

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `x` | `string` | Yes | The metadata key to aggregate |

Additional filter parameters are supported.

### Response

Returns an ECharts-compatible pie chart option object.

> **SDK:** [`sdk.blueprints.getPieChart(blueprintKey, query)`](/sdk/blueprints_operations#blueprint-charts--metrics)

---

## Get Count

Retrieve a count of entities matching the supplied filters.

```
GET /api/blueprints/{blueprintKey}/charts/count
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blueprintKey` | `string` | The blueprint identifier |

### Query Parameters

Standard filter parameters are supported (same as [entity listing](/api/blueprint-entities#list-entities)).

### Response

```json
{
  "count": 42
}
```

> **SDK:** [`sdk.blueprints.getCount(blueprintKey, query)`](/sdk/blueprints_operations#blueprint-charts--metrics)

---

## Get Sum

Retrieve sum values, optionally grouped by a property.

```
GET /api/blueprints/{blueprintKey}/charts/sum
```

### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `blueprintKey` | `string` | The blueprint identifier |

### Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `sum` | `string` | Yes | The numeric property to sum |
| `groupBy` | `string` | No | The property to group results by |

Additional filter parameters are supported.

### Response (with groupBy)

```json
{
  "groups": [
    { "group": "North", "sum": 15000 },
    { "group": "South", "sum": 12000 }
  ],
  "sum": 27000
}
```

### Response (without groupBy)

```json
{
  "sum": 27000
}
```

### Grouping Behavior

- **String / Number / Boolean**: Groups by exact values
- **Date / Datetime**: Groups by day of week (0 = Sunday, 6 = Saturday)
- **Time**: Groups by hour of day (0–23)

> **SDK:** [`sdk.blueprints.getSum(blueprintKey, sumProperty, groupByProperty, query)`](/sdk/blueprints_operations#sum-endpoint-details)
