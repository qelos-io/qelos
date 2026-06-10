---
name: handover-product-branch
description: Compare current branch (with uncommitted changes) to main/master and preview PRODUCT_HANDOVER updates for pending changes.
---

# Handover Product Branch

Preview and generate PRODUCT_HANDOVER updates for work-in-progress changes before they merge to main.

## When to Use

Run this command when:
- You have a feature branch with pending changes
- You want to preview documentation impact before merging
- You have uncommitted work you want to document
- You need to review what product changes are in this branch

## How It Works

1. **Detect target**: Finds default branch (main/master)
2. **Get branch diff**: Shows changes between current branch and default
3. **Include uncommitted**: Adds unstaged/untracked files to analysis
4. **Preview updates**: Shows what docs would change (dry-run mode by default)
5. **Generate preview**: Creates PRODUCT_HANDOVER_BRANCH/ with proposed updates

## Usage

```
/handover-product-branch
```

Options (when supported):
- `--apply` - Actually update PRODUCT_HANDOVER/ (default is preview only)
- `--output <dir>` - Custom preview directory (default: PRODUCT_HANDOVER_BRANCH/)

## Workflow

### Step 1: Detect Branches
```bash
# Find default branch
git symbolic-ref refs/remotes/origin/HEAD
# Get current branch
git branch --show-current
```

### Step 2: Generate Diff
```bash
# Committed changes on this branch
git diff origin/main..HEAD -- . ':!PRODUCT_HANDOVER/' ':!node_modules/'

# Uncommitted changes
git diff HEAD -- . ':!PRODUCT_HANDOVER/'
git ls-files --others --exclude-standard
```

### Step 3: Analyze Product Changes
Use **change-analyzer** sub-skill to:
- Review all pending changes
- Identify new/modified/removed features
- Categorize by impact (new capability, enhancement, removal)
- Note breaking changes

### Step 4: Generate Preview
Use **doc-previewer** sub-skill to:
- Create PRODUCT_HANDOVER_BRANCH/ directory
- Copy current PRODUCT_HANDOVER as base
- Apply proposed updates
- Add highlight markers for new/changed content

### Step 5: Diff Report
Show summary of what would change:
- New files to be added
- Files to be modified
- Content sections that would update

## Output Structure

```
PRODUCT_HANDOVER_BRANCH/          # Preview directory
├── PRODUCT.md                   # With proposed changes highlighted
├── api/
│   ├── PRODUCT.md
│   └── {new-endpoint}.md        # Marked as NEW
├── frontend/
│   └── {screen}/
│       └── PRODUCT.md           # With MODIFIED sections
└── DIFF_REPORT.md               # Summary of all changes
```

## Diff Report Format

```markdown
# Product Handover Diff Report

## New Features (3)
- api/todos-bulk.md - Bulk todo operations
- frontend/todos/filters/PRODUCT.md - Advanced filtering UI

## Modified Features (2)
- api/auth.md - Added OAuth providers (Google, GitHub)
- frontend/todos/PRODUCT.md - Updated table columns

## Removed Features (1)
- api/legacy-webhooks.md - Deprecated webhook system

## Impact Summary
- New user capabilities: Bulk operations, OAuth login
- UI changes: New filter panel on todos screen
- Breaking changes: Legacy webhooks removed
```

## Example

**Branch**: `feature/bulk-todos`
**Changes**: New bulk operations + UI

**Preview generates**:
- `api/todos-bulk.md` (new file - highlighted)
- Updated `api/PRODUCT.md` with new endpoint listed
- New `frontend/todos/bulk/PRODUCT.md` for bulk UI
- DIFF_REPORT.md showing all proposed changes

User reviews, then either:
- Discard preview
- Run with `--apply` to update actual PRODUCT_HANDOVER/
