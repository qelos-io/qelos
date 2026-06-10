---
name: change-analyzer
description: Analyze git diff from product perspective to identify new, modified, or removed user-facing features
---

# Change Analyzer

Analyze code changes and identify product impact - what new capabilities exist, what changed, what was removed.

## Task

Given a git diff, analyze from product perspective:
1. **New features**: What can users now do that they couldn't before?
2. **Modified features**: What existing capabilities changed?
3. **Removed features**: What capabilities no longer exist?
4. **Breaking changes**: Will users need to adapt?

## Input

- Git diff ( committed or uncommitted)
- Current PRODUCT_HANDOVER structure (for context)
- Repository structure

## Output Format

```json
{
  "new_features": [
    {
      "name": "Bulk Todo Creation",
      "type": "api_endpoint|screen|component|workflow",
      "service": "api",
      "description": "Users can create multiple todos in one request",
      "files_added": ["src/routes/todos-bulk.ts"],
      "user_impact": "high",
      "doc_location": "api/todos-bulk.md"
    }
  ],
  "modified_features": [
    {
      "name": "Todo List",
      "type": "screen",
      "service": "frontend",
      "description": "Added filtering by assignee",
      "files_changed": ["src/screens/TodoList.tsx"],
      "change_type": "enhancement",
      "doc_location": "frontend/todos/PRODUCT.md"
    }
  ],
  "removed_features": [
    {
      "name": "Legacy Webhooks",
      "type": "api_endpoint",
      "reason": "Replaced by event system",
      "doc_location": "api/legacy-webhooks.md"
    }
  ],
  "breaking_changes": [
    {
      "description": "POST /todos response format changed",
      "migration": "Update clients to handle new wrapper object"
    }
  ],
  "summary": {
    "total_new": 3,
    "total_modified": 2,
    "total_removed": 1,
    "user_impact": "medium"
  }
}
```

## Analysis Guidelines

### New Features
Look for:
- New API endpoints (new route files)
- New screens/pages (new React/Vue components with routes)
- New UI components with user interaction
- New workflows or processes

### Modified Features
Look for:
- Added fields/parameters to existing endpoints
- New UI elements on existing screens
- Additional steps in existing workflows
- Changed validation rules

### Removed Features
Look for:
- Deleted route handlers
- Removed UI components
- Deprecated API responses
- Deleted database tables/models

### Ignore (Not User-Facing)
- Refactoring without behavior change
- Performance optimizations
- Test file changes
- Documentation-only updates
- Internal tooling

## Prompt Template

You are a product change analyst. Review this git diff and identify product impact.

**Git Diff:**
```diff
{{diff_content}}
```

**Current Documentation Structure:**
{{current_structure}}

Identify:
1. New user-facing features (what can users now do?)
2. Modified existing features (what changed?)
3. Removed features (what no longer works?)
4. Breaking changes (will users need to update?)

Respond with ONLY valid JSON matching the output schema.
Focus on USER CAPABILITIES, not code changes.
