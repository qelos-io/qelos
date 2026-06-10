# product-skills

Generate PRODUCT_HANDOVER sitemap for product managers.

## Install

```bash
npx skills add <path-to-this-repo>
```

Or use directly:

```bash
npx skills use <path-to-this-repo>
```

## Usage

```
/init-product-handover
```

## Output

Creates `PRODUCT_HANDOVER/` directory with hierarchical PRODUCT.md files describing user-facing capabilities.

```
PRODUCT_HANDOVER/
├── PRODUCT.md           # Root: entire product in 1-2 sentences
├── api/
│   ├── PRODUCT.md       # API capabilities overview
│   ├── todos.md         # Todos REST endpoints
│   └── auth.md          # Auth endpoints (login, register)
└── frontend/
    ├── PRODUCT.md       # Frontend capabilities overview
    ├── todos/
    │   └── PRODUCT.md   # Todos screen: table, filters, fields
    └── create-todo/
        └── PRODUCT.md   # Create modal: fields, validation
```

## Structure

- `SKILL.md` - Main skill definition with usage instructions
