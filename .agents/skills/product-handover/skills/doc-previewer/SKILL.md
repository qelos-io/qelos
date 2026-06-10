---
name: doc-previewer
description: Generate preview of PRODUCT_HANDOVER updates without modifying actual docs. Creates parallel directory with proposed changes highlighted.
---

# Documentation Previewer

Create a preview of PRODUCT_HANDOVER changes for review before applying.

## Task

Generate a preview directory showing what docs would look like after updates:
1. Copy current PRODUCT_HANDOVER as base
2. Apply proposed changes with visual markers
3. Generate diff report
4. Allow review before actual application

## Input

- change_analysis: JSON from change-analyzer
- current_product_handover: Path to existing docs
- preview_dir: Where to create preview (default: PRODUCT_HANDOVER_BRANCH/)

## Workflow

### Step 1: Copy Base
```bash
cp -r PRODUCT_HANDOVER/ PRODUCT_HANDOVER_BRANCH/
```

### Step 2: Apply Changes with Markers

**New files**: Add banner at top:
```markdown
---
⚠️ **PREVIEW: NEW FILE** - This file does not exist in main yet
Feature: {feature_name}
Branch: {current_branch}
---

# {Feature Name}
...
```

**Modified files**: Highlight changes:
```markdown
# Feature Name

## What Users Can Do

- **Existing action**: Description
- **NEW**: New action from this branch ← [ADDED]

## Interface Elements

- **Field 1**: Description
- **Field 2**: Description (Updated: now accepts email too) ← [MODIFIED]
```

**Removed files**: Move to archive subfolder:
```
PRODUCT_HANDOVER_BRANCH/
├── .archive/
│   └── api/
│       └── legacy-webhooks.md  # With removal notice
└── api/
    └── PRODUCT.md  # Updated to remove reference
```

### Step 3: Generate Diff Report

Create `PRODUCT_HANDOVER_BRANCH/DIFF_REPORT.md`:

```markdown
# Product Handover Preview Report

**Source Branch**: {branch_name}
**Base**: origin/{default_branch}
**Generated**: {timestamp}

## Summary
- New features: {count}
- Modified features: {count}
- Removed features: {count}

## New Features

### api/todos-bulk.md
**What**: Bulk todo creation endpoint
**Impact**: Users can create up to 100 todos in one request
**Files**: [Preview](api/todos-bulk.md)

### frontend/todos/bulk/PRODUCT.md
**What**: Bulk creation UI
**Impact**: New screen for batch todo entry
**Files**: [Preview](frontend/todos/bulk/PRODUCT.md)

## Modified Features

### api/PRODUCT.md
- Added bulk endpoints section
- [View diff](.diffs/api-PRODUCT.md.diff)

## Removed Features

### api/legacy-webhooks.md
**Moved to**: `.archive/api/legacy-webhooks.md`
**Reason**: Replaced by event system in v2.0

## Next Steps

To apply these changes to PRODUCT_HANDOVER/:
```
/handover-product-branch --apply
```

To discard:
```
rm -rf PRODUCT_HANDOVER_BRANCH/
```
```

## Output

Preview directory structure:
```
PRODUCT_HANDOVER_BRANCH/
├── DIFF_REPORT.md              # Overview of all changes
├── .diffs/                     # Inline diffs for modified files
│   ├── api-PRODUCT.md.diff
│   └── frontend-todos-PRODUCT.md.diff
├── .archive/                   # Removed files
│   └── api/
│       └── legacy-webhooks.md
├── PRODUCT.md                  # With preview markers
├── api/
│   ├── PRODUCT.md              # With modifications marked
│   ├── todos-bulk.md           # New file with [NEW] banner
│   └── todos.md                # Unchanged
└── frontend/
    └── todos/
        ├── PRODUCT.md          # With modifications marked
        └── bulk/
            └── PRODUCT.md      # New file with [NEW] banner
```

## Preview Markers

Use these visual indicators:
- `[NEW]` - Brand new feature/file
- `[ADDED]` - New content in existing file
- `[MODIFIED]` - Changed content
- `[DEPRECATED]` - Scheduled for removal
- `[REMOVED]` - No longer exists

## Guidelines

- Never modify actual PRODUCT_HANDOVER/ in preview mode
- Make changes obvious at a glance
- Include original content for context
- Allow easy comparison side-by-side
- Clear instructions for apply/discard
