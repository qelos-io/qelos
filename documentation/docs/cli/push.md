---
title: Push Command
editLink: true
---

# {{ $frontmatter.title }}

The `push` command uploads local resources to your Qelos instance, allowing you to update existing resources or create new ones from your local filesystem.

## Usage

```bash
qelos push <type> <path>
```

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `type` | Type of resource to push | Yes |
| `path` | Local directory path containing the resources to push | Yes |

## Resource Types

Currently supported resource types:

- **components** - Vue components to push to your Qelos instance
- **plugins** - Plugin configurations and code
- **integrations** - Integration configurations
- **blueprints** - Data model blueprints

## How It Works

When you run the push command:

1. **Authenticates** with your Qelos instance using environment variables
2. **Reads** all files of the appropriate type from the specified directory
3. **Checks** if each resource already exists in your Qelos instance
4. **Updates** existing resources or **creates** new ones
5. **Reports** progress for each resource pushed

## Examples

### Push Components

```bash
qelos push components ./my-components
```

**Output:**
```
Pushing component: header-component
Component updated: header-component
Pushing component: footer-component
Component updated: footer-component
Pushing component: new-component
Component pushed: new-component
All components pushed
```

### Push from Specific Directory

```bash
# Push from a nested directory
qelos push components ./src/qelos-components

# Push from an absolute path
qelos push components /Users/username/projects/components
```

### Push After Changes

```bash
# Make changes to local components
vim ./components/header-component.vue

# Push the changes
qelos push components ./components
```

## Workflow Examples

### Development Workflow

```bash
# 1. Pull components to work on locally
qelos pull components ./local-components

# 2. Make changes in your IDE
code ./local-components/header-component.vue

# 3. Test your changes locally

# 4. Push changes back to Qelos
qelos push components ./local-components
```

### Version Control Integration

```bash
# Pull latest from Qelos
qelos pull components ./src/components

# Make changes and commit
git add src/components
git commit -m "Updated header component"

# Push to Qelos
qelos push components ./src/components

# Push to Git
git push origin main
```

### Multi-Environment Deployment

```bash
# Push to staging
export QELOS_URL=https://staging.qelos.com
qelos push components ./components

# Test in staging

# Push to production
export QELOS_URL=https://production.qelos.com
qelos push components ./components
```

## Update vs Create

The push command automatically determines whether to update or create:

### Update Existing Resource

If a resource with the same identifier exists:
```
Pushing component: header-component
Component updated: header-component
```

The existing resource will be updated with your local changes.

### Create New Resource

If no resource with that identifier exists:
```
Pushing component: new-component
Component pushed: new-component
```

A new resource will be created in your Qelos instance.

## Configuration

The push command uses these environment variables:

```bash
export QELOS_URL=https://your-instance.com
export QELOS_USERNAME=your-username
export QELOS_PASSWORD=your-password
```

See [CLI Configuration](/cli/#configuration) for more details.

## File Format

### Components

Components must be `.vue` files. The filename (without extension) becomes the component identifier:

```
header-component.vue  →  identifier: "header-component"
footer-component.vue  →  identifier: "footer-component"
```

**Example component:**
```vue
<!-- header-component.vue -->
<template>
  <header class="app-header">
    <h1>{{ title }}</h1>
  </header>
</template>

<script setup>
import { ref } from 'vue'
const title = ref('My App')
</script>

<style scoped>
.app-header {
  background: #333;
  color: white;
  padding: 1rem;
}
</style>
```

## Options

View all available options:

```bash
qelos push --help
```

## Common Issues

### Authentication Failed

**Problem:** Cannot authenticate with Qelos instance

**Solution:**
```bash
# Verify environment variables
echo $QELOS_URL
echo $QELOS_USERNAME

# Set them if missing
export QELOS_URL=https://your-instance.com
export QELOS_USERNAME=your-username
export QELOS_PASSWORD=your-password
```

### File Not Found

**Problem:** Cannot find files in specified directory

**Solution:**
```bash
# Check directory exists and contains files
ls -la ./my-components

# Verify file extensions (.vue for components)
ls ./my-components/*.vue

# Use correct path
qelos push components ./my-components
```

### Permission Denied

**Problem:** Insufficient permissions to update resources

**Solution:**
1. Verify your user has appropriate permissions in Qelos
2. Check workspace access rights
3. Contact your Qelos administrator

### Invalid Component Format

**Problem:** Component file is not valid Vue syntax

**Solution:**
1. Validate your Vue component syntax
2. Check for syntax errors in your IDE
3. Test the component locally before pushing

## Best Practices

### 1. Test Before Pushing

Always test your changes locally before pushing:

```bash
# Run local tests
npm test

# Verify component works
npm run dev

# Then push
qelos push components ./components
```

### 2. Use Version Control

Commit changes to Git before pushing to Qelos:

```bash
git add .
git commit -m "Updated header component"
qelos push components ./components
git push origin main
```

### 3. Push to Staging First

Test in staging before production:

```bash
# Push to staging
export QELOS_URL=https://staging.qelos.com
qelos push components ./components

# Test thoroughly

# Push to production
export QELOS_URL=https://production.qelos.com
qelos push components ./components
```

### 4. Backup Before Major Changes

Create a backup before pushing major updates:

```bash
# Backup current state
qelos pull components ./backups/components-$(date +%Y%m%d)

# Make changes and push
qelos push components ./components
```

### 5. Document Changes

Keep track of what you push:

```bash
qelos push components ./components
echo "$(date): Pushed updated header component" >> CHANGELOG.md
git add CHANGELOG.md
git commit -m "Update changelog"
```

## Validation

Before pushing, ensure:

- ✅ Files are in the correct format (`.vue` for components)
- ✅ File names are valid identifiers (no spaces, special characters)
- ✅ Component syntax is valid
- ✅ You're connected to the correct Qelos instance
- ✅ You have proper permissions

## Safety Tips

### Avoid Overwriting Production

Be careful when pushing to production:

```bash
# Always verify the URL before pushing
echo $QELOS_URL

# Use a confirmation step
read -p "Push to $QELOS_URL? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  qelos push components ./components
fi
```

### Review Changes

Review what will be pushed:

```bash
# List files that will be pushed
ls ./components/*.vue

# Check for unexpected files
find ./components -name "*.vue" -type f
```

## Related Commands

- [Pull Command](/cli/pull) - Pull resources from Qelos
- [Create Command](/cli/create) - Create a new plugin project

## Related Resources

- [Components Documentation](/pre-designed-frontends/components/)
- [Plugin Development](/plugins/create)
- [SDK Components API](/sdk/managing_plugins)
