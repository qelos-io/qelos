# Blueprints

Define and manage data model schemas (blueprints) that power entity CRUD, permissions, and plugin pages.

## What Users Can Do

- **List blueprints**: Browse all data models with search and filter
- **Create blueprint**: Define properties, relations, permissions, events, limitations
- **Update blueprint**: Full replace or incremental patch of schema fields
- **Delete blueprint**: Remove when no entity records exist

## Endpoints

### GET /api/blueprints
List blueprints; filter by name, description, identifier.

### GET /api/blueprints/:identifier
Retrieve schema including properties, relations, permissions, limitations.

### POST /api/blueprints
Create blueprint (privileged editor).

**Request**: name, identifier, properties[], relations[], permissions, limitations, events

### PUT /api/blueprints/:identifier
Full replace of blueprint fields.

### PATCH /api/blueprints/:identifier
Incremental merge of properties, relations, update mappings.

### DELETE /api/blueprints/:identifier
Delete blueprint (blocked if entities exist).

## Blueprint Schema Concepts

| Field | Description |
|-------|-------------|
| **Properties** | Typed fields (string, number, date, relation, etc.) |
| **Relations** | Links to other blueprints |
| **Permissions** | CRUD rules scoped to user, workspace, tenant, or guest |
| **Limitations** | Rate limits, max records, validation rules |
| **Events** | Platform events emitted on create/update/delete |
| **Workspace labels** | Scope blueprint to specific workspace segments |

## Related

- [Entities & charts](no-code-entities.md)
- [Blueprint builder](../frontend/blueprints/PRODUCT.md)
- [AI blueprint generation](ai.md)
