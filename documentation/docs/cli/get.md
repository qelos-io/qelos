---
title: Get Command
editLink: true
---

# Get Command

The `get` command allows you to preview files that would be pushed to your Qelos instance without actually pushing them. This is useful for reviewing what changes will be sent before committing to a push operation.

## Overview

The `get` command works with Git to show you:
- **Staged files**: Files that are staged in Git but not yet committed
- **Committed files**: Files from the last commit
- **File classification**: Automatically categorizes files by type (components, blueprints, plugins, etc.)
- **Dependencies**: Shows which parent resources reference child resources (e.g., which plugin references an HTML file)

## Usage

```bash
qelos get <type> <path> [options]
```

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `type` | Required | Type of files to get. See [File Types](#file-types) below |
| `path` | Required | Base path to search for resources (typically `.` for current directory) |

### Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--json` | `-j` | Output results in JSON format instead of human-readable format |
| `--verbose` | `-V` | Enable verbose logging with debug information |

## File Types

The following file types are supported:

| Type | Description | Example |
|------|-------------|---------|
| `components` | Vue component files | `components/my-component.vue` |
| `blueprints` | Blueprint JSON files | `blueprints/my-blueprint.json` |
| `configs` | Configuration JSON files | `configs/my-config.json` |
| `plugins` | Plugin JSON files | `plugins/my-plugin.json` |
| `blocks` | Block JSON files | `blocks/my-block.json` |
| `integrations` | Integration JSON files | `integrations/my-integration.json` |
| `connections` | Connection JSON files | `connections/my-connection.json` |
| `committed` | All files from the last commit | `qelos get committed .` |
| `staged` | All staged files (excluding deleted) | `qelos get staged .` |
| `all` or `*` | All supported file types | `qelos get all .` |

## Examples

### Preview Staged Files

See what files are staged and will be pushed:

```bash
qelos get staged .
```

Output:
```
ℹ Found 13 staged file(s)
ℹ   plugins: 1 file(s)
ℹ   microFrontends: 1 file(s) (will be pushed via parent plugin)

=== STAGED FILES ===

PLUGINS (1):
  - plugins/aaa.plugin.json

MICROFRONTENDS (1):
  - plugins/micro-frontends/test.html
```

### Preview Committed Files

See what files were in the last commit:

```bash
qelos get committed .
```

### JSON Output

Get output in JSON format for scripting:

```bash
qelos get staged . --json
```

Output:
```json
{
  "components": [],
  "blueprints": [],
  "configs": [],
  "plugins": ["/Users/username/project/plugins/aaa.plugin.json"],
  "blocks": [],
  "integrations": [],
  "connections": [],
  "prompts": [],
  "microFrontends": ["/Users/username/project/plugins/micro-frontends/test.html"]
}
```

### Verbose Output

Enable verbose logging to see debug information:

```bash
qelos -V get staged .
```

## File Classification

The `get` command automatically classifies files based on their location and extension:

### Components
- `.vue` files in `components/` directories

### Blueprints
- `.json` files in `blueprints/` directories

### Configurations
- `.json` files in `configs/` directories

### Plugins
- `.json` files in `plugins/` directories
- Files ending with `.plugin.json`

### Blocks
- `.json` files in `blocks/` directories

### Integrations
- `.json` files in `integrations/` directories

### Connections
- `.json` files in `connections/` directories

### Prompts
- `.md` files in `integrations/prompts/` directories

### Micro-Frontends
- `.html` files (automatically linked to their parent plugins)

## Dependency Detection

The `get` command automatically detects dependencies between resources:

### Plugin-Micro-Frontend Relationships

When an HTML file (micro-frontend) is found, the command searches for plugins that reference it:

```json
{
  "name": "my-plugin",
  "routes": [
    {
      "path": "/my-route",
      "$ref": "./micro-frontends/my-html.html"
    }
  ]
}
```

The output will show:
- The HTML file under `MICROFRONTENDS`
- The referencing plugin under `PLUGINS`

### Integration-Prompt Relationships

When a prompt file is found, the command searches for integrations that reference it:

```json
{
  "name": "my-integration",
  "prompts": {
    "system": "./prompts/system-prompt.md"
  }
}
```

## Deleted Files

The `get` command automatically ignores deleted files from Git staging. This prevents trying to push files that have been removed.

## Use Cases

### Before Pushing

Check what will be pushed before actually pushing:

```bash
# Preview staged files
qelos get staged .

# If everything looks good, push them
qelos push staged .
```

### Review Changes

Review what files were changed in the last commit:

```bash
qelos get committed .
```

### Script Integration

Use the JSON output for scripting or CI/CD pipelines:

```bash
#!/bin/bash
# Get staged files as JSON
files=$(qelos get staged . --json)

# Check if there are any plugins to push
plugins=$(echo "$files" | jq '.plugins | length')
if [ "$plugins" -gt 0 ]; then
  echo "Found $plugins plugin(s) to push"
  qelos push staged .
fi
```

## Troubleshooting

### File Not Found Warnings

If you see warnings about files not being found:

```
⚠ Warning: Could not find any plugin referencing HTML file: plugins/micro-frontends/test.html
```

This usually means:
- The HTML file is not referenced by any plugin's `$ref` field
- The plugin file is not yet staged/committed

### No Staged Files

If no staged files are found:

```
ℹ No staged files found
```

This means:
- No files are currently staged in Git
- Use `git add` to stage files first
- Or use `qelos get committed .` to see the last commit

## Related Commands

- [push](/cli/push) - Push files to your Qelos instance
- [pull](/cli/pull) - Pull files from your Qelos instance
- [create](/cli/create) - Create new plugin projects
