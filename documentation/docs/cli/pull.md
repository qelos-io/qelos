---
title: Pull Command
editLink: true
---

# {{ $frontmatter.title }}

The `pull` command downloads resources from your Qelos instance to your local filesystem, allowing you to work on components, plugins, integrations, and blueprints locally.

## Usage

```bash
qelos pull <type> <path>
```

## Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `type` | Type of resource to pull | Yes |
| `path` | Local directory path where resources will be saved | Yes |

## Resource Types

Currently supported resource types:

- **components** - Vue components from your Qelos instance
- **plugins** - Plugin configurations and code
- **integrations** - Integration configurations
- **blueprints** - Data model blueprints

## How It Works

When you run the pull command:

1. **Authenticates** with your Qelos instance using environment variables
2. **Fetches** all resources of the specified type
3. **Creates** the target directory if it doesn't exist
4. **Saves** each resource as a file using its identifier as the filename
5. **Reports** progress for each resource pulled

## Examples

### Pull Components

```bash
qelos pull components ./my-components
```

**Output:**
```
Created directory: ./my-components
Found 5 components to pull
Pulled component: header-component
Pulled component: footer-component
Pulled component: sidebar-component
Pulled component: card-component
Pulled component: modal-component
All 5 components pulled to ./my-components
```

**Result:**
```
my-components/
├── header-component.vue
├── footer-component.vue
├── sidebar-component.vue
├── card-component.vue
└── modal-component.vue
```

### Pull to Specific Directory

```bash
# Pull to a nested directory
qelos pull components ./src/qelos-components

# Pull to an absolute path
qelos pull components /Users/username/projects/components
```

### Pull for Backup

```bash
# Create a timestamped backup
qelos pull components ./backups/components-$(date +%Y%m%d-%H%M%S)
```

## Workflow Examples

### Development Workflow

```bash
# 1. Pull components to work on locally
qelos pull components ./local-components

# 2. Open in your IDE
code ./local-components

# 3. Make changes to the .vue files

# 4. Push changes back when ready
qelos push components ./local-components
```

### Version Control Integration

```bash
# Pull components into your Git repository
qelos pull components ./src/components

# Track changes with Git
git add src/components
git commit -m "Pulled latest components from Qelos"

# Make changes and commit
git add src/components
git commit -m "Updated header component styling"

# Push back to Qelos
qelos push components ./src/components
```

### Multi-Environment Setup

```bash
# Pull from production
export QELOS_URL=https://production.qelos.com
qelos pull components ./prod-components

# Pull from staging
export QELOS_URL=https://staging.qelos.com
qelos pull components ./staging-components

# Compare differences
diff -r prod-components staging-components
```

## Configuration

The pull command uses these environment variables:

```bash
export QELOS_URL=https://your-instance.com
export QELOS_USERNAME=your-username
export QELOS_PASSWORD=your-password
```

See [CLI Configuration](/cli/#configuration) for more details.

## File Format

### Components

Components are saved as `.vue` files with the component's identifier as the filename:

```vue
<!-- header-component.vue -->
<template>
  <header>
    <!-- Component template -->
  </header>
</template>

<script setup>
// Component logic
</script>

<style scoped>
/* Component styles */
</style>
```

## Options

View all available options:

```bash
qelos pull --help
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

### Directory Permission Denied

**Problem:** Cannot create or write to directory

**Solution:**
```bash
# Check directory permissions
ls -la ./

# Create directory manually with proper permissions
mkdir -p ./my-components
chmod 755 ./my-components

# Try again
qelos pull components ./my-components
```

### Connection Timeout

**Problem:** Cannot connect to Qelos instance

**Solution:**
1. Verify the URL is correct and accessible
2. Check your network connection
3. Ensure the Qelos instance is running
4. Check firewall settings

### No Resources Found

**Problem:** "Found 0 components to pull"

**Solution:**
1. Verify you have resources in your Qelos instance
2. Check your user permissions
3. Ensure you're connected to the correct workspace

## Best Practices

### 1. Use Version Control

Always pull into a Git repository to track changes:

```bash
git init
qelos pull components ./components
git add .
git commit -m "Initial pull from Qelos"
```

### 2. Regular Backups

Create regular backups before major changes:

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
qelos pull components ./backups/components-$DATE
```

### 3. Separate Directories

Keep different resource types in separate directories:

```bash
qelos pull components ./resources/components
qelos pull plugins ./resources/plugins
qelos pull blueprints ./resources/blueprints
```

### 4. Document Changes

Keep a changelog when pulling updates:

```bash
qelos pull components ./components
echo "$(date): Pulled latest components" >> CHANGELOG.md
```

## Related Commands

- [Push Command](/cli/push) - Push local changes back to Qelos
- [Create Command](/cli/create) - Create a new plugin project

## Related Resources

- [Components Documentation](/pre-designed-frontends/components/)
- [Plugin Development](/plugins/create)
- [SDK Components API](/sdk/managing_plugins)
