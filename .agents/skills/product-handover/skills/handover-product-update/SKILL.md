---
name: handover-product-update
description: Update PRODUCT_HANDOVER based on code changes since last documentation commit. Reviews diff product-wise and adds new features.
---

# Handover Product Update

Update existing PRODUCT_HANDOVER documentation when code changes introduce new features or modify existing ones.

## When to Use

Run this command when:
- You've added new features since last PRODUCT_HANDOVER update
- Existing features have changed behavior
- You want to sync docs with current codebase state

## How It Works

1. **Find baseline**: Locates the last commit where PRODUCT_HANDOVER/ was modified
2. **Get diff**: Shows all code changes since that commit
3. **Analyze changes**: Identifies new/modified features from product perspective
4. **Update docs**: Adds new sections or updates existing ones

## Usage

```
/handover-product-update
```

## Workflow

### Step 1: Find Baseline Commit
```bash
git log -1 --format="%H" -- PRODUCT_HANDOVER/
```

### Step 2: Generate Diff
```bash
git diff <baseline-commit>..HEAD -- . ':!PRODUCT_HANDOVER/' ':!node_modules/' ':!.git/'
```

### Step 3: Analyze Product Changes
Use **change-analyzer** sub-skill to:
- Review diff from product perspective
- Identify new user-facing features
- Detect modified capabilities
- Note removed/deprecated features

### Step 4: Update Documentation
Use **doc-updater** sub-skill to:
- Create new feature pages for new capabilities
- Update existing pages for modified features
- Mark removed features (strike-through + note)
- Update cross-references
- Regenerate navigation links

## Output

Modified files in PRODUCT_HANDOVER/:
- New: `api/{new-endpoint}.md`
- Updated: `frontend/{screen}/PRODUCT.md`
- Updated: Root PRODUCT.md (if new sections added)
- Changelog entry in PRODUCT_HANDOVER/CHANGELOG.md

## Example

**Diff shows**: New `POST /todos/bulk` endpoint added

**Action**: 
- Create `api/todos-bulk.md` describing bulk creation
- Update `api/PRODUCT.md` to list new endpoint
- Update `api/todos.md` to cross-reference bulk operation
