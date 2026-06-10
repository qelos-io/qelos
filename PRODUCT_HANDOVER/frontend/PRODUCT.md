# Admin Frontend

The Qelos admin panel is a Vue 3 web application for building, configuring, and operating multi-tenant SaaS apps—data models, users, workspaces, plugins, integrations, billing, and runtime pages.

## User Flows

1. **Onboard** — Login → Quick Start wizard → configure app, theme, blueprints
2. **Model data** — Create blueprints → define permissions → use in plugin CRUDs
3. **Build UI** — Install plugins → add pages/modals → edit visually in Play/Edit mode
4. **Connect services** — Add integration sources → wire trigger-to-target workflows → configure AI agents
5. **Operate** — Manage users/workspaces → view events log → configure billing
6. **Run app** — End users navigate plugin pages in Play mode (authenticated or guest)

## Screens

### Authentication
- [Login, OAuth callback, logout](auth/PRODUCT.md)

### Core
- [Home & admin dashboard](home/PRODUCT.md)

### Administration
- [Users & profile](users/PRODUCT.md)
- [Workspaces](workspaces/PRODUCT.md)
- [Events log & admin tools](admin-tools/PRODUCT.md)

### Content & structure
- [Configurations & appearance](configurations/PRODUCT.md)
- [Blueprints (data models)](blueprints/PRODUCT.md)
- [Content boxes & components](content-blocks/PRODUCT.md)
- [Storage & assets](assets/PRODUCT.md)
- [Drafts](drafts/PRODUCT.md)

### Extensibility
- [Plugins & pages](plugins/PRODUCT.md)
- [Integrations & AI agents](integrations/PRODUCT.md)

### Billing
- [Pricing plans & coupons](pricing/PRODUCT.md)

### Runtime
- [Play mode & visual editing](play-mode/PRODUCT.md)

## Related

- [API](../api/PRODUCT.md) — Backend endpoints powering each screen
- [SDK](../sdk/PRODUCT.md) — External app integration
- [CLI](../cli/PRODUCT.md) — Pull/push resources from local files
