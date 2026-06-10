# Content Boxes & Components

Reusable content snippets and Vue UI component library.

## What Users Can Do

- **Manage content boxes**: Create, edit HTML/content snippets used in login, headers, pages
- **Manage components**: Create, edit reusable Vue components for page builder
- **Resume drafts**: Unfinished content box edits appear in Drafts screen

## Interface Elements

| Screen | Route | Key elements |
|--------|-------|--------------|
| **Content boxes list** | `/blocks` | Searchable list, create action |
| **Create content box** | `/blocks/new` | Name, description, HTML/content editor |
| **Edit content box** | `/blocks/:id` | Content editor, metadata |
| **Components list** | `/components` | Table: identifier, description, last updated |
| **Create component** | `/components/new` | Vue SFC editor, metadata form |
| **Edit component** | `/components/:id` | Code editor, props, bindings |

## Content Box Usage

Content boxes are referenced by identifier in:
- Login/register page slots
- User header custom content
- Plugin page templates

## Related

- [Content API](../../api/content.md)
- [Components API](../../api/no-code-components.md)
- [Drafts](../drafts/PRODUCT.md)
