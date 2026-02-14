# Qelos CLI - Hard Push Flag Documentation

## Overview

The `--hard` flag (alias: `-h`) is an advanced feature for the `qelos push` command that allows you to synchronize your Qelos environment with your local repository. When used, it will remove resources from Qelos that don't exist locally, ensuring your remote environment matches exactly what's in your local files.

## ⚠️ Important Warning

This is a destructive operation. Resources removed from Qelos cannot be recovered unless you have a backup. Always double-check the list of resources that will be removed before confirming.

## Syntax

```bash
qelos push <type> <path> --hard
# or using the short alias
qelos push <type> <path> -h
```

## Supported Resource Types

The `--hard` flag only works with the following resource types:
- `components` - Vue components
- `blueprints` - Blueprint definitions
- `plugins` - Plugin configurations
- `integrations` - Integration configurations
- `all` or `*` - All supported types

## Requirements

1. **Directory Only**: The `--hard` flag can only be used when pushing a directory, not a single file
2. **Confirmation Required**: You must explicitly confirm before any resources are removed
3. **Network Connection**: Requires connection to your Qelos instance to fetch existing resources

## Workflow

When you use the `--hard` flag, the following happens:

1. **Validation**: The command checks if the flag is used with supported types and a directory
2. **Fetch**: Pulls the list of existing resources from Qelos
3. **Compare**: Compares local files with remote resources
4. **Warning**: Shows a warning message and lists resources that will be removed
5. **Confirmation**: Asks for your confirmation (default: No)
6. **Push**: If confirmed, pushes all local resources first
7. **Cleanup**: After successful push, removes the remote resources that don't exist locally

## Examples

### Basic Usage

```bash
# Remove remote components that don't exist locally
qelos push components ./components --hard

# Remove remote blueprints that don't exist locally
qelos push blueprints ./blueprints -h

# Remove all types of resources that don't exist locally
qelos push all ./my-project --hard
```

### Typical Workflow

```bash
# 1. Pull existing resources
qelos pull components ./components

# 2. Remove some local files
rm ./components/old-component.vue
rm ./components/unused-component.vue

# 3. Push with --hard to clean up remote
qelos push components ./components --hard
# This will show:
# ⚠️  WARNING: You are using the --hard flag
# The following resources will be removed:
#   - components: old-component
#   - components: unused-component
# Do you want to continue?
```

## Interactive Confirmation

The confirmation dialog supports:
- **Arrow Keys**: ↑/↓ to navigate between options
- **Enter**: Select the highlighted option
- **Y/N**: Quick select Yes/No
- **Esc/Ctrl+C**: Cancel the operation

```
Do you want to continue?
(•) No (default)
( ) Yes, remove them
```

## Error Handling

- If the push fails, no resources are removed
- If a resource cannot be removed, an error is logged but the operation continues
- The command will exit if you cancel the confirmation

## Best Practices

1. **Backup First**: Before using `--hard` on production, consider backing up your resources
2. **Review Carefully**: Always read the list of resources to be removed before confirming
3. **Use in CI/CD**: The `--hard` flag is useful for automated deployments to ensure clean environments
4. **Test Locally**: Test the operation on a development environment first

## Use Cases

### 1. Cleaning Up Development Environment
```bash
# Remove experimental components from dev
qelos push components ./src/components --hard
```

### 2. Synchronizing After Refactoring
```bash
# After moving/deleting multiple components
qelos push all ./src --hard
```

### 3. Maintaining Clean Repository
```bash
# Ensure no orphaned resources exist
qelos push blueprints ./blueprints --hard
```

### 4. Automated Deployments
```bash
# In CI/CD pipeline to ensure clean state
qelos push components ./dist/components --hard --yes
```

## Troubleshooting

### "Operation cancelled by user"
The confirmation was declined or cancelled. No changes were made.

### "No resources to remove"
All remote resources exist locally, so nothing needs to be removed.

### "Failed to remove resource"
Check network connection and permissions. The resource might be in use by other parts of the system.

## Technical Details

### Order of Operations
1. Local files are pushed first
2. Only after successful push, remote cleanup occurs
3. This ensures no conflicts during the push operation

### Resource Identification
- **Components**: Identified by filename (without .vue extension)
- **Blueprints**: Identified by filename (without .blueprint.json extension)
- **Plugins**: Identified by the `key` field in the JSON
- **Integrations**: Identified by the `identifier` field in the JSON

### Environment Variables
The command uses `QELOS_HARD_PUSH_REMOVE` internally to track resources to be removed after the push completes.

## Related Commands

- `qelos pull` - Download resources from Qelos
- `qelos push` - Upload resources to Qelos (without --hard)
- `qelos generate rules` - Generate IDE rules for Qelos resources

## Migration from Previous Versions

If you were previously manually cleaning up resources:
1. Use `qelos pull` to get current state
2. Delete unwanted local files
3. Use `qelos push --hard` to clean up automatically

## Feedback and Issues

If you encounter any issues with the `--hard` flag:
1. Check the error messages for details
2. Ensure you have proper network connectivity
3. Verify file permissions
4. Contact support with the error logs
