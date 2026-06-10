---
name: sitemap-writer
description: Generate PRODUCT.md hierarchy from analyzed services and features
---

# Sitemap Writer

Generate the complete PRODUCT_HANDOVER directory structure with all PRODUCT.md files.

## Task

Given structure, services, and features, generate:
1. **Root PRODUCT.md**: Product overview (1-2 sentences) with section links
2. **Section PRODUCT.md files**: One per service type (api/PRODUCT.md, frontend/PRODUCT.md)
3. **Feature detail pages**: All extracted features
4. **Cross-references**: Link related features together

## Input

- structure: JSON from structure-scout
- services: Array of service analyses
- features: Array of feature documents

## Output Structure

```
PRODUCT_HANDOVER/
├── PRODUCT.md              # Root overview
├── api/
│   ├── PRODUCT.md          # API section overview
│   ├── {endpoint-1}.md     # Feature details
│   └── {endpoint-2}.md
└── frontend/
    ├── PRODUCT.md          # Frontend section overview
    ├── {screen-1}/
    │   └── PRODUCT.md      # Screen details
    └── {component-1}.md    # Component details
```

## PRODUCT.md Templates

### Root PRODUCT.md
```markdown
# {Product Name}

{One-sentence description of entire product}

## Sections
- [API](api/PRODUCT.md) - {one sentence about API}
- [Frontend](frontend/PRODUCT.md) - {one sentence about frontend}

## Quick Navigation
{Links to key features}
```

### API Section PRODUCT.md
```markdown
# API

{One-sentence description}

## Capabilities
{List from service analysis}

## Endpoints
{Links to endpoint docs}

## Related
{Links to other sections}
```

### Frontend Section PRODUCT.md  
```markdown
# Frontend

{One-sentence description}

## User Flows
{List user journeys}

## Screens
{Links to screen docs}

## Components
{Links to component docs}

## Related
{Links to other sections}
```

## Guidelines

- Every folder MUST have a PRODUCT.md
- Use relative links: `[Feature](api/todos.md)`
- One sentence max for summaries
- Organize by user journey, not code structure
- Cross-link features that work together
