# Play Mode & Visual Editing

End-user runtime for plugin pages and admin visual composition tools.

## What Users Can Do

- **Browse plugin pages**: Authenticated runtime at dynamic plugin routes
- **Access guest pages**: Public plugin pages without login
- **Preview guest pages (admin)**: Screen editor at `/screen-editor/*`
- **Edit pages visually**: Toggle Edit mode to compose pages with drag-and-drop
- **Manage layout (admin)**: Toggle Manager mode for assets panel and layout tools
- **Impersonate users (admin)**: Act as another user with exit banner

## Play Mode

Plugin-defined pages render as:
- **Pre-designed templates** — plain, basic-form, rows-list scaffolds
- **External iframe MFEs** — Embedded third-party URLs
- **Dynamic routes** — Registered from plugin micro-frontend config

| Mode | Auth | Route pattern |
|------|------|---------------|
| Authenticated play | Required | Catch-all under authenticated shell |
| Guest play | None | Catch-all at root with guest meta |
| Screen editor | Admin | `/screen-editor/*` for guest page preview |

## Edit Mode

Toggle via header (persisted in localStorage):
- Add/edit/remove page components
- Open code structure editor
- Clone or remove pages
- Guided editor tour for first-time users

## Manager Mode

Admin-only toggle enabling:
- Layout editing tools
- Assets side panel (upload, browse, select files)

## Plugin Modals

Dynamically opened modal overlays hosting plugin-defined modal micro-frontends.

## Related

- [Plugins](../plugins/PRODUCT.md)
- [Assets](../assets/PRODUCT.md)
- [Components API](../../api/no-code-components.md)
