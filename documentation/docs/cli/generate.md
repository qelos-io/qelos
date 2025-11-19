---
title: Generate Rules
editLink: true
---

# {{ $frontmatter.title }}

The `generate rules` command creates IDE-specific rules files that help AI assistants and developers understand the structure and conventions of pulled Qelos resources.

## Overview

When working with pulled Qelos resources (components, blocks, blueprints, plugins), AI assistants and IDEs benefit from understanding:
- How components map to their metadata files
- Naming conventions (PascalCase files → kebab-case usage)
- Available global components and their APIs
- Blueprint structures and entity mappings
- Block and micro-frontend limitations

The `generate rules` command automatically scans your pulled resources and creates comprehensive documentation files tailored for your IDE.

## Usage

```bash
qelos generate rules <type>
```

### Arguments

- `<type>` - The IDE type to generate rules for:
  - `windsurf` - Generates `.windsurf/rules/qelos-resources.md`
  - `cursor` - Generates `.cursorrules`
  - `claude` - Generates `.clinerules`
  - `all` - Generates rules for all supported IDEs

## Examples

### Generate Rules for Windsurf

```bash
# Navigate to your project directory with pulled resources
cd my-project

# Generate Windsurf rules
qelos generate rules windsurf
```

This creates `.windsurf/rules/qelos-resources.md` with comprehensive documentation.

### Generate Rules for All IDEs

```bash
qelos generate rules all
```

This creates rules files for Windsurf, Cursor, and Claude in one command.

### Typical Workflow

```bash
# Pull resources from Qelos
qelos pull components ./components
qelos pull blocks ./blocks
qelos pull blueprints ./blueprints
qelos pull plugins ./plugins

# Generate IDE rules to help with development
qelos generate rules all

# Now your IDE has context about:
# - Component naming conventions
# - Available global components
# - Blueprint structures
# - Block/micro-frontend limitations
```

## Generated Rules Content

The generated rules file includes:

### 1. Component Information
- **Structure**: Vue 3.5 SFC with Composition API
- **Naming Convention**: PascalCase files (e.g., `ProductCard.vue`) map to kebab-case usage (`<product-card>`)
- **Metadata Mapping**: How `components.json` maps to component files
- **Library Documentation**: Links to Vue 3, Vue Router, Element Plus, Vue I18n, Pinia APIs

### 2. Qelos Global Components
- **Complete List**: All globally available components (ai-chat, form-input, monaco, etc.)
- **Descriptions**: What each component does
- **Usage**: No imports needed, use directly in templates
- **Directives**: Available directives like `v-loading`

### 3. Block Information
- **Structure**: HTML template files with metadata in `blocks.json`
- **Critical Limitations**: 
  - ❌ **Cannot contain `<script>` tags**
  - ✅ Must use Vue components for JavaScript functionality
- **What's Allowed**: HTML, CSS, Vue components, global components

### 4. Blueprint Information
- **Structure**: Correct `IBlueprint` interface from global-types
- **Example**: Business logic blueprint (product catalog)
- **Entity Mapping**: How properties, relations, dispatchers, and permissions work
- **Usage**: Understanding data models for component development

### 5. Plugin Information
- **Structure**: Plugin configuration with micro-frontends
- **Micro-frontend References**: How `$ref` points to HTML files
- **Routes and Requirements**: Navigation and permission structure
- **Critical Limitations**: 
  - ❌ **Micro-frontend HTML cannot contain `<script>` tags**
  - ✅ Must use Vue components for JavaScript functionality

## Key Rules Highlighted

### No Script Tags in HTML Files

The generated rules emphasize this critical limitation:

**❌ WRONG:**
```html
<!-- blocks/my-block.html -->
<div id="my-element"></div>
<script>
  document.getElementById("my-element").addEventListener("click", ...);
</script>
```

**✅ CORRECT:**
```html
<!-- blocks/my-block.html -->
<!-- Create components/InteractiveButton.vue with your logic -->
<interactive-button></interactive-button>
```

This applies to:
- Block HTML files
- Micro-frontend HTML files

### Component Naming Convention

The rules explain the PascalCase → kebab-case conversion:

```
ProductCard.vue       →  <product-card>
VideoPlayer.vue       →  <video-player>
UserProfile.vue       →  <user-profile>
DataTable.vue         →  <data-table>
```

When you see `<product-card>` in HTML, the actual file is `components/ProductCard.vue`.

## Benefits

### For AI Assistants
- Understands your project structure automatically
- Knows which components are available globally
- Follows correct naming conventions
- Avoids common mistakes (like adding script tags to blocks)
- References correct API documentation

### For Developers
- Quick reference for project conventions
- Links to relevant documentation
- Examples of correct patterns
- Understanding of resource relationships

### For Teams
- Consistent conventions across the team
- Onboarding documentation for new developers
- Single source of truth for project structure

## When to Regenerate

Regenerate rules when:
- You pull new resources from Qelos
- Component structure changes
- You switch to a different IDE
- Qelos global components are updated

```bash
# After pulling new resources
qelos pull components ./components
qelos generate rules all
```

## Output Locations

| IDE | File Path |
|-----|-----------|
| Windsurf | `.windsurf/rules/qelos-resources.md` |
| Cursor | `.cursorrules` |
| Claude | `.clinerules` |

## Notes

- Rules are generated based on **scanned resources** in your current directory
- If no resources are found, the command will warn you to run `pull` first
- The command fetches the latest Qelos global components list from documentation
- Rules use generic examples (no client-specific data)

## Related Commands

- [`qelos pull`](/cli/pull) - Pull resources from Qelos instance
- [`qelos push`](/cli/push) - Push local changes back to Qelos
- [`qelos create`](/cli/create) - Create new plugin projects

## Related Resources

- [Components Documentation](/pre-designed-frontends/components/) - Learn about global components
- [Blueprint Structure](/sdk/blueprints_operations.md) - Understanding blueprints
- [Plugin Development](/plugins/create) - Creating plugins
