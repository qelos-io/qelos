# Events & Webhooks

Platform event logging, analytics, and inbound webhook triggers.

## What Users Can Do

- **Record events**: Ingest platform events that fan out to integration hooks
- **Query events**: Paginated log with filters (kind, name, source, user, workspace, date range)
- **Analyze events**: Count and sum numeric metadata with grouping
- **Trigger webhooks**: Authenticated inbound webhooks run active integration workflows
- **Transform data**: Multi-step payload manipulation before/after integrations

## Event Endpoints

### GET /api/events
Paginated event log with search and filters.

### GET /api/events/filter-options
Distinct kinds, names, and sources for filter UI.

### GET /api/events/count
Count matching events (cached).

### GET /api/events/sum
Aggregate numeric metadata; group by day/month/year/event/source/kind.

### POST /api/events
Ingest platform event; fan out to integration hooks.

### GET /api/events/:eventId
Retrieve single event record.

## Webhook Endpoints

### ANY /api/webhooks/:integrationId
Authenticated inbound webhook runs active `apiWebhook` integration (role-gated).

## Data Manipulation

### POST /api/data-manipulation
Execute multi-step payload transformation workflow.

## Common Event Kinds

User registration, entity CRUD, asset uploads, subscription changes, custom plugin events

## Related

- [Plugins & integrations](plugins.md)
- [Events log screen](../frontend/admin-tools/PRODUCT.md)
