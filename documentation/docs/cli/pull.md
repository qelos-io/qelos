---
title: Pull Command
editLink: true
---

# {{ $frontmatter.title }}

The `pull` command downloads resources from your Qelos instance to your local filesystem, allowing you to work on components, blueprints, configurations, plugins, blocks, and more locally.

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
- **blueprints** - Data model blueprints and entity schemas
- **config** / **configs** / **configuration** - Custom configuration objects
- **plugins** - Plugin configurations and code
- **blocks** - Pre-designed frontend blocks
- **integrations** / **integration** - Workflow or agent integrations (stored as `.integration.json`)
- **connections** / **connection** - Integration sources (stored as `.connection.json`)
- **all** / **\*** - Pull all resource types into organized subdirectories

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
├── modal-component.vue
└── components.json
```

### Pull Blueprints

```bash
qelos pull blueprints ./my-blueprints
```

**Output:**
```
Created directory: ./my-blueprints
Found 3 blueprint(s) to pull
→ Pulled: user
→ Pulled: product
→ Pulled: order
ℹ Pulled 3 blueprint(s)
✓ Successfully pulled blueprints to ./my-blueprints
```

**Result:**
```
my-blueprints/
├── user.blueprint.json
├── product.blueprint.json
└── order.blueprint.json
```

### Pull Configurations

```bash
qelos pull config ./my-configs
```

**Output:**
```
Created directory: ./my-configs
Found 2 configuration(s) to pull
→ Pulled: app-settings
→ Pulled: feature-flags
ℹ Pulled 2 configuration(s)
✓ Successfully pulled config to ./my-configs
```

**Result:**
```
my-configs/
├── app-settings.config.json
└── feature-flags.config.json
```

### Pull Plugins

```bash
qelos pull plugins ./my-plugins
```

**Output:**
```
Created directory: ./my-plugins
Found 3 plugin(s) to pull
→ Pulled: payment-gateway
→ Pulled: analytics-tracker
→ Pulled: email-service
ℹ Pulled 3 plugin(s)
✓ Successfully pulled plugins to ./my-plugins
```

**Result:**
```
my-plugins/
├── payment-gateway/
├── analytics-tracker/
└── email-service/
```

### Pull Blocks

```bash
qelos pull blocks ./my-blocks
```

**Output:**
```
Created directory: ./my-blocks
Found 3 block(s) to pull
→ Pulled: hero-section
→ Pulled: contact-form
→ Pulled: testimonials
ℹ Saved blocks.json with metadata
ℹ Pulled 3 block(s)
✓ Successfully pulled blocks to ./my-blocks
```

**Result:**
```
my-blocks/
├── hero-section.vue
├── contact-form.vue
├── testimonials.vue
└── blocks.json
```

### Pull Integrations

```bash
qelos pull integrations ./my-integrations
```

**Output:**
```
Created directory: ./my-integrations
Found 4 integration(s) to pull
→ Pulled: lead_router
→ Pulled: enrich_profile
→ Pulled: ai_agent_support
→ Pulled: notify_sales
ℹ Pulled 4 integration(s)
✓ Successfully pulled integrations
```

Each integration is saved as `<identifier>.integration.json`. The CLI automatically strips server-only properties (`tenant`, `plugin`, `user`, `created`, `updated`, `__v`, etc.) so the files only contain the fields you can edit (`trigger`, `target`, `dataManipulation`, `active`). The backend recalculates derived fields such as `kind` when you push the file back.

### Pull Connections (Integration Sources)

```bash
qelos pull connections ./my-connections
```

**Output:**
```
Created directory: ./my-connections
Found 2 connection(s) to pull
→ Pulled connection: OpenAI
→ Pulled connection: CRM Webhook
ℹ Pulled 2 connection(s)
✓ Successfully pulled connections
```

Connections are saved as `<name>.connection.json` files that include `name`, `kind`, `labels`, `metadata`, and an `authentication` placeholder:

```json
{
  "_id": "64f1c1e5c3f2",
  "name": "OpenAI",
  "kind": "openai",
  "labels": ["ai", "default"],
  "metadata": { "defaultModel": "gpt-4o" },
  "authentication": {
    "$var": "INTEGRATION_AUTH_OPENAI"
  }
}
```

> 👉 **Authentication values are never written to disk.**  
> Set an environment variable with the name in `$var` (e.g. `INTEGRATION_AUTH_OPENAI`) containing the JSON credentials. The CLI reads that env var during `qelos push connections ...`. If the env var is missing, metadata is synced but the encrypted authentication secret is left unchanged.

### Pull All Resources

```bash
qelos pull all ./my-resources
# Or using the wildcard
qelos pull * ./my-resources
```

**Output:**
```
Pulling all resources to ./my-resources

Pulling components to ./my-resources/components
ℹ Created directory: ./my-resources/components
ℹ Found 5 component(s) to pull
→ Pulled: user-profile
→ Pulled: navigation-menu
→ Pulled: data-table
...
✓ Successfully pulled components

Pulling blueprints to ./my-resources/blueprints
ℹ Created directory: ./my-resources/blueprints
ℹ Found 3 blueprint(s) to pull
→ Pulled: user
→ Pulled: product
→ Pulled: order
...
✓ Successfully pulled blueprints

Pulling configs to ./my-resources/configs
ℹ Created directory: ./my-resources/configs
ℹ Found 2 configuration(s) to pull
→ Pulled: app-settings
→ Pulled: feature-flags
...
✓ Successfully pulled configs

Pulling plugins to ./my-resources/plugins
ℹ Created directory: ./my-resources/plugins
ℹ Found 2 plugin(s) to pull
→ Pulled: payment-gateway
→ Pulled: analytics-tracker
...
✓ Successfully pulled plugins

Pulling blocks to ./my-resources/blocks
ℹ Created directory: ./my-resources/blocks
ℹ Found 3 block(s) to pull
→ Pulled: hero-section
→ Pulled: contact-form
→ Pulled: testimonials
...
✓ Successfully pulled blocks

✓ Successfully pulled all resources to ./my-resources
```

**Result:**
```
my-resources/
├── components/
│   ├── user-profile.vue
│   ├── navigation-menu.vue
│   ├── data-table.vue
│   └── components.json
├── blueprints/
│   ├── user.blueprint.json
│   ├── product.blueprint.json
│   └── order.blueprint.json
├── configs/
│   ├── app-settings.config.json
│   └── feature-flags.config.json
├── plugins/
│   ├── payment-gateway/
│   └── analytics-tracker/
└── blocks/
    ├── hero-section.vue
    ├── contact-form.vue
    ├── testimonials.vue
    └── blocks.json
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

A `components.json` metadata file is also created with component information.

### Blueprints

Blueprints are saved as `.blueprint.json` files:

```json
{
  "identifier": "user",
  "name": "User",
  "description": "User entity blueprint",
  "entityIdentifierMechanism": "objectid",
  "properties": {
    "email": {
      "title": "Email",
      "type": "string",
      "required": true
    },
    "name": {
      "title": "Name",
      "type": "string",
      "required": true
    }
  },
  "permissions": [],
  "permissionScope": "workspace",
  "relations": [],
  "dispatchers": {
    "create": true,
    "update": true,
    "delete": true
  }
}
```

### Configurations

Configurations are saved as `.config.json` files:

```json
{
  "key": "app-settings",
  "public": true,
  "kind": "settings",
  "description": "Application settings",
  "metadata": {
    "theme": "dark",
    "language": "en",
    "notifications": true
  }
}
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

Or use the `all` option to automatically organize them:

```bash
qelos pull all ./resources
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
