# API

All API traffic enters through the gateway, which resolves the tenant, authenticates the caller, and proxies to backend services. External apps and the admin panel call the same REST surface.

## Capabilities

| Area | What users can do |
|------|-------------------|
| **Gateway** | Access all services from one host; multi-tenant routing by domain |
| **Auth** | Sign up, sign in, social OAuth, sessions, profiles, API tokens |
| **Workspaces** | Create workspaces, invite members, switch active workspace |
| **Users** | Admins manage tenant users; users manage their profile |
| **Content** | Store app configurations and reusable content blocks |
| **No-code** | Define blueprints, CRUD entities, compile Vue components, charts |
| **AI** | Manage agents, chat, threads, vector storage, admin assistants |
| **Plugins** | Install plugins, wire integrations, emit/query events, webhooks |
| **Payments** | Plans, checkout, subscriptions, coupons, invoices |
| **Assets** | Configure storage backends, upload and manage files |
| **Drafts** | Save in-progress admin edits per user |

## Endpoints

- [Gateway & routing](gateway.md)
- [Authentication](auth.md)
- [Workspaces & invites](workspaces-and-invites.md)
- [Users & API tokens](users-and-tokens.md)
- [Content & blocks](content.md)
- [Blueprints](no-code-blueprints.md)
- [Entities & charts](no-code-entities.md)
- [Components](no-code-components.md)
- [AI agents & chat](ai.md)
- [Plugins & integrations](plugins.md)
- [Events & webhooks](events-and-webhooks.md)
- [Payments & billing](payments.md)
- [Assets, storage & drafts](assets-and-drafts.md)

## Related

- [Admin Frontend](../frontend/PRODUCT.md) — UI for most admin API operations
- [SDK](../sdk/PRODUCT.md) — Programmatic access from external apps
- [Integrators](../integrators/PRODUCT.md) — Same-origin proxy for framework apps
