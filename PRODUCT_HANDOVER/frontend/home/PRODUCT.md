# Home & Admin Dashboard

Role-aware landing and privileged admin overview.

## What Users Can Do

- **Land on home**: Privileged users see dashboard; others redirect to configured homeScreen or welcome
- **View admin dashboard**: Metrics, quick links, onboarding wizard at `/admin-dashboard`
- **Navigate sections**: Tabbed views for Blueprints, Plugins, Integrations, Connect your app, Settings
- **Start onboarding**: Multi-step Quick Start wizard for new tenants

## Interface Elements

| Screen | Route | Key elements |
|--------|-------|--------------|
| **Home** | `/` | Role-based redirect or welcome message |
| **Admin Dashboard** | `/admin-dashboard` | Dashboard metrics, Blueprints/Plugins/Integrations tabs, integrator suggestions, settings cards |
| **Quick Start Wizard** | Modal on dashboard | App name/logo, theme, app type, OpenAI token, AI-generated blueprints |

## Admin Dashboard Tabs

- **Dashboard** — Overview metrics and status
- **Blueprints** — Shortcut to data model list
- **Plugins** — Shortcut to plugin management
- **Integrations** — Shortcut to connections and workflows
- **Connect your app** — Framework integrator setup suggestions
- **Settings** — Links to key configuration screens

## Related

- [Blueprints](../blueprints/PRODUCT.md)
- [Plugins](../plugins/PRODUCT.md)
- [Integrations](../integrations/PRODUCT.md)
