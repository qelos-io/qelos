# Plugins & Pages

Extend the app with plugins, micro-frontends, and custom pages.

## What Users Can Do

- **List plugins**: Search installed plugins at `/plugins`
- **Create plugin**: Full creation form or quick-create modal
- **Edit plugin**: Tabbed editor for APIs, hooks, CRUDs, injectables, micro-frontends
- **Quick-create page**: Scaffold new plugin page from navigation action

## Plugin Editor Tabs

| Tab | What users configure |
|-----|---------------------|
| **Basic Info** | Name, description, manifest URL |
| **APIs** | Proxy paths to plugin backend |
| **Hooks & Events** | Event subscriptions and handlers |
| **CRUDs** | Blueprint-bound data endpoints for pages |
| **Injectables** | Scripts/styles injected into admin |
| **Micro-Frontends** | Pages, modals, nav items |
| **Summary** | Overview of plugin configuration |

## Interface Elements

- **Plugins list** — Search, quick-create modal, install action
- **Create plugin** — Full form
- **Edit plugin** — Tabbed editor with MFE manager
- **Quick page create** — Modal from nav: name, template, blueprint binding

## Micro-Frontend Types

- **Page** — Nav item with route (pre-designed template or iframe URL)
- **Modal** — Overlay opened programmatically
- **Guest page** — Public route without authentication

## Related

- [Plugins API](../../api/plugins.md)
- [Play mode](../play-mode/PRODUCT.md)
- [Blueprints](../blueprints/PRODUCT.md)
