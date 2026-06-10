---
name: doc-updater
description: Update PRODUCT_HANDOVER files based on change analysis. Creates new docs, modifies existing ones, handles removals.
---

# Documentation Updater

Apply change analysis to update PRODUCT_HANDOVER documentation files.

## Task

Given change analysis output, update documentation:
1. **Create new docs** for new features
2. **Update existing docs** for modified features
3. **Mark removals** for deleted features
4. **Update navigation** (parent PRODUCT.md files)
5. **Maintain cross-references**

## Input

- change_analysis: JSON from change-analyzer
- current_product_handover: Path to existing docs
- templates: Template files for new docs

## Workflow

### New Features
For each new feature in `change_analysis.new_features`:

1. Generate new markdown file using appropriate template:
   - `api_endpoint` → `templates/endpoint.md`
   - `screen` → `templates/screen-PRODUCT.md`
   - `component` → `templates/component.md`

2. Place at `change_analysis.new_features[].doc_location`

3. Update parent PRODUCT.md to include link:
   - Add to capabilities list
   - Add to endpoints/screens list
   - Cross-link related features

### Modified Features
For each modified feature:

1. Read existing doc at `doc_location`
2. Identify sections to update based on `change_type`:
   - `enhancement`: Add new capability bullets
   - `change`: Update existing descriptions
   - `refactor`: Note implementation change (usually no doc update needed)

3. Apply surgical updates:
   - Add new user actions
   - Update field lists
   - Add version note: "Updated: {date} - {change_description}"

### Removed Features
For each removed feature:

1. Option A - Archive (recommended):
   - Move to `PRODUCT_HANDOVER/.archive/{original_path}`
   - Add redirect note in parent pointing to replacement

2. Option B - In-place marking:
   - Add deprecation banner at top
   - Strike through content
   - Add: "⚠️ **Removed**: This feature was removed on {date}. {reason}"

3. Remove from parent PRODUCT.md navigation

### Navigation Updates
After all content updates:

1. Update section PRODUCT.md files:
   - Regenerate capabilities list
   - Update feature links
   - Add new cross-references

2. Update root PRODUCT.md:
   - If new sections added, list them
   - Update quick navigation links

## Output

List of modified files with change type:
```json
{
  "created": ["api/todos-bulk.md", "frontend/todos/bulk/PRODUCT.md"],
  "modified": ["api/PRODUCT.md", "api/todos.md"],
  "archived": ["api/legacy-webhooks.md"],
  "unchanged": ["frontend/auth/PRODUCT.md"]
}
```

## Template Variables

For new feature docs, use these variables:
- `{{feature_name}}` - Human-readable name
- `{{one_sentence_description}}` - From change analysis
- `{{service_name}}` - Parent service (api, frontend, etc.)
- `{{user_actions}}` - Derived from code analysis
- `{{related_features}}` - Auto-detected from code references

## Guidelines

- Preserve manual edits in existing docs (add to them, don't replace)
- Match tone/style of existing documentation
- Only document user-facing changes
- Add "Last updated: {date}" to modified files
- Keep cross-references working after moves
