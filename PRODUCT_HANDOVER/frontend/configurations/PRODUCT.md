# Configurations & Appearance

App settings, branding, auth config, and design system tokens.

## What Users Can Do

- **List configurations**: Searchable grid of all app configs at `/configurations`
- **Create configuration**: New custom key-value document at `/configurations/new`
- **Edit configuration**: Specialized forms per config type at `/configurations/:key`
- **Customize appearance**: Theme palettes, colors, typography at appearance settings

## Configuration Types

| Key | Form | Purpose |
|-----|------|---------|
| `app-configuration` | App form | Name, logo, URLs, home screen |
| `auth-configuration` | Auth form | Login layout, social providers |
| `workspace-configuration` | Workspace form | Workspace mode, labels |
| `ssr-scripts` | SSR form | Head/body injection scripts |
| `users-header` | Header form | Custom user menu content |
| Other keys | Generic JSON | Custom metadata |

## Appearance Settings

- Preset design palettes with live preview
- Design tokens: colors, fonts, spacing, shadows
- Separate from core app-configuration metadata

## Interface Elements

- **Configurations list** — Grid with search; auto-provisions required system configs
- **Configuration form** — Type-specific or generic JSON editor
- **Appearance screen** — Palette picker, DesignConfiguration panel, preview

## Related

- [Content API](../../api/content.md)
- [Authentication screen](../auth/PRODUCT.md)
