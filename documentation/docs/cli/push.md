---
title: Push Command
editLink: true
---

# {{ $frontmatter.title }}

The `push` command uploads local resources to your Qelos instance, allowing you to update existing resources or create new ones from your local filesystem. Supports components, blueprints, configurations, plugins, blocks, and more.

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
- **blueprints** - Data model blueprints and entity schemas
- **config** / **configs** / **configuration** - Custom configuration objects
- **plugins** - Plugin configurations and code
- **blocks** - Pre-designed frontend blocks
- **integrations** / **integration** - Workflow or agent integrations (stored as `.integration.json`)
- **connections** / **connection** - Integration sources (stored as `.connection.json`)
- **all** / **\*** - Push all resource types from organized subdirectories

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
Pushing components from ./my-components
ℹ Found 3 component(s) to push
→ Pushing component: header-component
✓ Updated: header-component
→ Pushing component: footer-component
✓ Updated: footer-component
→ Pushing component: new-component
✓ Created: new-component
ℹ Pushed 3 component(s)
✓ Successfully pushed components
```

### Push Blueprints

```bash
qelos push blueprints ./my-blueprints
```

**Output:**
```
Pushing blueprints from ./my-blueprints
ℹ Found 3 blueprint(s) to push
→ Pushing blueprint: user
✓ Updated: user
→ Pushing blueprint: product
✓ Updated: product
→ Pushing blueprint: order
✓ Created: order
ℹ Pushed 3 blueprint(s)
✓ Successfully pushed blueprints
```

### Push Configurations

```bash
qelos push config ./my-configs
```

**Output:**
```
Pushing config from ./my-configs
ℹ Found 2 configuration(s) to push
→ Pushing configuration: app-settings
✓ Updated: app-settings
→ Pushing configuration: feature-flags
✓ Created: feature-flags
ℹ Pushed 2 configuration(s)
✓ Successfully pushed config
```

### Push Plugins

```bash
qelos push plugins ./my-plugins
```

**Output:**
```
Pushing plugins from ./my-plugins
ℹ Found 3 plugin(s) to push
→ Pushing plugin: payment-gateway
✓ Updated: payment-gateway
→ Pushing plugin: analytics-tracker
✓ Updated: analytics-tracker
→ Pushing plugin: email-service
✓ Created: email-service
ℹ Pushed 3 plugin(s)
✓ Successfully pushed plugins
```

### Push Blocks

```bash
qelos push blocks ./my-blocks
```

**Output:**
```
Pushing blocks from ./my-blocks
ℹ Found 3 block(s) to push
→ Pushing block: hero-section
✓ Updated: hero-section
→ Pushing block: contact-form
✓ Updated: contact-form
→ Pushing block: testimonials
✓ Created: testimonials
ℹ Pushed 3 block(s)
✓ Successfully pushed blocks
```

### Push All Resources

```bash
qelos push all ./my-resources
# Or using the wildcard
qelos push * ./my-resources
```

**Output:**
```
Pushing all resources from ./my-resources

Pushing components from ./my-resources/components
ℹ Found 3 component(s) to push
→ Pushing component: user-profile
✓ Updated: user-profile
→ Pushing component: navigation-menu
✓ Updated: navigation-menu
→ Pushing component: data-table
✓ Created: data-table
...
✓ Successfully pushed components

Pushing blueprints from ./my-resources/blueprints
ℹ Found 3 blueprint(s) to push
→ Pushing blueprint: user
✓ Updated: user
→ Pushing blueprint: product
✓ Updated: product
→ Pushing blueprint: order
✓ Created: order
...
✓ Successfully pushed blueprints

Pushing configs from ./my-resources/configs
ℹ Found 2 configuration(s) to push
→ Pushing configuration: app-settings
✓ Updated: app-settings
→ Pushing configuration: feature-flags
✓ Updated: feature-flags
...
✓ Successfully pushed configs

Pushing plugins from ./my-resources/plugins
ℹ Found 2 plugin(s) to push
→ Pushing plugin: payment-gateway
✓ Updated: payment-gateway
→ Pushing plugin: analytics-tracker
✓ Updated: analytics-tracker
...
✓ Successfully pushed plugins

Pushing blocks from ./my-resources/blocks
ℹ Found 3 block(s) to push
→ Pushing block: hero-section
✓ Updated: hero-section
→ Pushing block: contact-form
✓ Updated: contact-form
→ Pushing block: testimonials
✓ Created: testimonials
...
✓ Successfully pushed blocks

✓ Successfully pushed all resources from ./my-resources
```

**Note:** When using `all` or `*`, the command expects subdirectories named `components`, `blueprints`, `configs`, `plugins`, and `blocks`. If a subdirectory doesn't exist, it will be skipped.

### Push Integrations

```bash
qelos push integrations ./my-integrations
```

**Output:**
```
Pushing integrations from ./my-integrations
ℹ Found 4 integration(s) to push
→ Pushing integration: lead_router
✓ Updated: lead_router
→ Pushing integration: ai_agent_support
✓ Created: ai_agent_support
ℹ Pushed 4 integration(s)
✓ Successfully pushed integrations
```

Guidelines:

- Each integration file must end with `.integration.json`.
- Only include editable fields (`trigger`, `target`, `dataManipulation`, `active`). Server-only values such as `tenant`, `plugin`, `user`, `created`, `updated`, and `__v` are ignored on push and stripped automatically when pulling.
- The backend recalculates the `kind` array for you; you do not need to specify it manually.

### Push Connections (Integration Sources)

```bash
qelos push connections ./my-connections
```

**Output:**
```
Pushing connections from ./my-connections
ℹ Found 2 connection(s) to push
→ Pushing connection: OpenAI
✓ Updated: OpenAI
→ Pushing connection: CRM Webhook
✓ Created: CRM Webhook
ℹ Pushed 2 connection(s)
✓ Successfully pushed connections
```

Connections include an `authentication` placeholder that points to an environment variable:

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

- Before running `qelos push connections ...`, set the referenced environment variable with the JSON credentials:

```bash
export INTEGRATION_AUTH_OPENAI='{"token":"sk-..."}'
```

- The CLI reads that env var at push time and sends the decrypted payload to Qelos.
- If the env var is missing, the CLI skips updating sensitive authentication data but still syncs metadata and labels.
- Newly created connections write the returned `_id` back to the `.connection.json` file so future pushes update the same source.

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

### Blueprints

Blueprints must be `.blueprint.json` files. The filename must match the pattern `{identifier}.blueprint.json`:

```
user.blueprint.json     →  identifier: "user"
product.blueprint.json  →  identifier: "product"
```

**Example blueprint:**
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
      "required": true,
      "description": "User email address"
    },
    "name": {
      "title": "Name",
      "type": "string",
      "required": true
    },
    "role": {
      "title": "Role",
      "type": "string",
      "enum": ["admin", "user", "guest"]
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

Configurations must be `.config.json` files. The filename must match the pattern `{key}.config.json`:

```
app-settings.config.json    →  key: "app-settings"
feature-flags.config.json   →  key: "feature-flags"
```

**Example configuration:**
```json
{
  "key": "app-settings",
  "public": true,
  "kind": "settings",
  "description": "Application settings",
  "metadata": {
    "theme": "dark",
    "language": "en",
    "notifications": {
      "email": true,
      "push": false
    },
    "features": {
      "darkMode": true,
      "betaFeatures": false
    }
  }
}
```

### Plugins

Plugins are organized in directories. Each plugin directory should contain the plugin's configuration and code files.

```
my-plugins/
├── payment-gateway/
│   ├── plugin.json
│   └── index.js
└── analytics-tracker/
    ├── plugin.json
    └── index.js
```

### Blocks

Blocks must be `.vue` files. The filename (without extension) becomes the block identifier:

```
hero-section.vue   →  identifier: "hero-section"
contact-form.vue   →  identifier: "contact-form"
testimonials.vue   →  identifier: "testimonials"
```

**Example block:**
```vue
<!-- hero-section.vue -->
<template>
  <div class="hero-section">
    <h1>Welcome to Our Platform</h1>
    <p>Build amazing applications with ease</p>
    <button>Get Started</button>
  </div>
</template>

<script setup>
// Block logic
</script>

<style scoped>
.hero-section {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
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

- ✅ Files are in the correct format:
  - `.vue` for components and blocks
  - `.blueprint.json` for blueprints
  - `.config.json` for configurations
  - Plugin directories with proper structure
- ✅ File names match the required pattern:
  - Components: `{identifier}.vue`
  - Blueprints: `{identifier}.blueprint.json`
  - Configurations: `{key}.config.json`
  - Blocks: `{identifier}.vue`
  - Plugins: Directory structure with `plugin.json`
- ✅ JSON files are valid and properly formatted
- ✅ Required fields are present (identifier, key, etc.)
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
