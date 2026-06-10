# Entities & Charts

CRUD operations on blueprint records and analytics aggregations for dashboards.

## What Users Can Do

- **Query entities**: List, filter, search, sort, paginate, populate relations
- **Create records**: Add entities with schema validation and permission checks
- **Update/delete records**: Modify or remove with audit trail
- **Guest access**: Create/read when blueprint permissions allow anonymous users
- **View analytics**: Pie charts, line/bar charts, count cards, sum cards from entity data

## Entity Endpoints

### GET /api/blueprints/:identifier/entities
Query records with `$q` search, sort, skip/limit, populate, outer-populate, flat response.

### GET /api/blueprints/:identifier/entities/:entityId
Retrieve single record with optional relation population.

### POST /api/blueprints/:identifier/entities
Create record; validates metadata, enforces limitations, emits events.

### PUT /api/blueprints/:identifier/entities/:entityId
Update record with validation and audit trail.

### DELETE /api/blueprints/:identifier/entities/:entityId
Delete single record.

### DELETE /api/blueprints/:identifier/entities
Bulk-delete all entities (blocked if related entities exist elsewhere).

## Chart Endpoints

### GET /api/blueprints/:identifier/charts/pie
Aggregate into ECharts pie chart by property (`x` query param).

### GET /api/blueprints/:identifier/charts/count
Return entity count with optional filters.

### GET /api/blueprints/:identifier/charts/sum
Sum numeric property, optionally grouped.

### GET /api/blueprints/:identifier/charts/:chartType
Line/bar/area charts by property type.

## Permission Scopes

Records can be scoped to: **user**, **workspace**, **tenant**, or **guest** — each blueprint defines CRUD rules per scope.

## Related

- [Blueprints](no-code-blueprints.md)
- [Plugins & integrations](plugins.md) — CRUD plugin pages bind to blueprints
