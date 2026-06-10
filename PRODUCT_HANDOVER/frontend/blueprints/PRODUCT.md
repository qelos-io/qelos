# Blueprints (Data Models)

No-code data model designer for entity schemas, permissions, and relations.

## What Users Can Do

- **List blueprints**: Table or relations graph view at `/no-code/blueprints`
- **Create blueprint**: Full schema builder at `/no-code/create-blueprint`
- **Edit blueprint**: Properties, permissions, events, relations at `/no-code/edit-blueprint/:id`
- **Search blueprints**: Filter by name or identifier

## Blueprint Form Tabs

| Tab | What users configure |
|-----|---------------------|
| **Properties** | Field types, validation, identifiers |
| **Permissions** | CRUD rules per user/workspace/tenant/guest scope |
| **Events** | Platform events on create/update/delete |
| **Relations** | Links to other blueprints |
| **Limitations** | Rate limits, max records |

## Interface Elements

- **Blueprints list** — Toggle list/graph view, search, create modal
- **Blueprint form** — Tabbed editor with property descriptor builder
- **Relations graph** — Visual map of blueprint connections
- **Create modal** — Quick name/identifier entry

## User Flow

1. Admin creates blueprint with properties and permissions
2. Blueprint becomes available for entity CRUD and plugin CRUD bindings
3. Plugin pages can bind to blueprint for list/form screens
4. AI assistant can generate or modify blueprints via natural language

## Related

- [Blueprints API](../../api/no-code-blueprints.md)
- [Entities API](../../api/no-code-entities.md)
- [Integrations](../integrations/PRODUCT.md) — AI blueprint generation
