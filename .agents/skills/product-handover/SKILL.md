---
name: product-handover
description: Generate PRODUCT_HANDOVER sitemap for product managers. Creates a hierarchical documentation structure where each folder has a PRODUCT.md describing user-facing capabilities.
---

# Product Handover

Generate a complete product sitemap in `PRODUCT_HANDOVER/` directory, designed for product managers to understand what the system does and what users can accomplish.

## When to Use

Run this skill when you need to:
- Document a codebase for product managers
- Create a sitemap of user-facing features
- Hand over a project to non-technical stakeholders
- Understand the product capabilities of an unfamiliar codebase

## Output Structure

Creates `PRODUCT_HANDOVER/` with:

```
PRODUCT_HANDOVER/
├── PRODUCT.md              # Root: entire product in 1-2 sentences
├── api/
│   ├── PRODUCT.md          # API capabilities overview  
│   ├── auth.md             # Auth endpoints (login, register, etc.)
│   ├── todos.md            # Todos REST API
│   └── ...
├── frontend/
│   ├── PRODUCT.md          # Frontend capabilities overview
│   ├── todos/
│   │   └── PRODUCT.md      # Todos screen: table, filters, fields
│   └── create-todo/
│       └── PRODUCT.md      # Create modal: fields, validation
└── ...
```

Every folder has a `PRODUCT.md` describing:
- One-sentence summary (max 2 sentences)
- What users can do here
- Links to child features

## Usage

```
/init-product-handover
```

## Steps

1. **Structure Scout**: Discover repository structure
   - Identify services (API, frontend, shared, workers)
   - Detect monorepo vs single repo
   - Map service relationships

2. **Service Analyzer** (parallel per service):
   - Analyze each service for product capabilities
   - Identify user-facing features
   - Extract domain language

3. **Feature Extractor** (parallel per feature):
   - Document individual features
   - Describe user actions and outcomes
   - Identify fields, inputs, screens

4. **Sitemap Writer**:
   - Generate root PRODUCT.md
   - Create section PRODUCT.md files
   - Write feature detail pages
   - Cross-link related features

## Token Optimization

- Services analyzed in parallel batches (3 at a time)
- Features extracted in parallel batches (5 at a time)
- Each subagent receives only relevant context

## Example Output

**PRODUCT_HANDOVER/PRODUCT.md**:
```markdown
# Todos App

A task management system where users can create, organize, and track todos with team collaboration features.

## Sections
- [API](api/PRODUCT.md) - REST endpoints for todo CRUD, auth, and sharing
- [Frontend](frontend/PRODUCT.md) - Web interface for managing todos

## Quick Navigation
- [Todos API](api/todos.md)
- [Todos Screen](frontend/todos/PRODUCT.md)
- [Create Todo](frontend/create-todo/PRODUCT.md)
```

**PRODUCT_HANDOVER/api/todos.md**:
```markdown
# Todos API

REST endpoints for managing todo items with CRUD operations and sharing.

## Endpoints

### GET /todos
List todos with optional filtering.

### POST /todos
Create a new todo.

**Request**: title (required), description, dueDate, assigneeId

**Response**: todo object with id, createdAt, status
```

**PRODUCT_HANDOVER/frontend/todos/PRODUCT.md**:
```markdown
# Todos Screen

Main dashboard showing all todos in a filterable table view.

## What Users Can Do
- **View todos**: See all todos in sortable table
- **Filter**: Filter by status, assignee, due date
- **Search**: Full-text search in titles and descriptions

## Interface Elements
- **Table**: Columns for title, status, assignee, due date
- **Filters**: Dropdown for status, date range picker
- **Search bar**: Full-text search input
```
