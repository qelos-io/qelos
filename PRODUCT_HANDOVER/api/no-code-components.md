# Components

Compile, manage, and serve custom Vue 3 UI components for no-code pages.

## What Users Can Do

- **List components**: Browse compiled Vue components (metadata only in list)
- **Create component**: Write Vue SFC source; platform compiles to JS/CSS
- **Update component**: Edit source; recompiles on change
- **Bulk upsert**: Create/update multiple components in one request
- **Serve assets**: Public delivery of compiled bundles for page embedding

## Endpoints

### GET /api/components
List components (privileged editor).

### GET /api/components/:identifier
Retrieve component including Vue SFC source.

### POST /api/components
Create component; compiles and extracts required props.

**Request**: identifier, name, description, content (Vue SFC)

### PUT /api/components/:identifier
Update component; recompiles when content changes.

### DELETE /api/components/:identifier
Remove component.

### POST /api/components/bulk
Upsert multiple components with queued compilation.

### GET /api/static/components/*
Public compiled JS/CSS bundles and lazy-loader manifest.

## Related

- [Content boxes screen](../frontend/content-blocks/PRODUCT.md)
- [Play mode](../frontend/play-mode/PRODUCT.md)
