---
title: CLI Tool
editLink: true
---
# CLI Tool

The Qelos CLI (`@qelos/plugins-cli`) is a command-line interface tool that helps developers manage and synchronize Qelos resources between their local development environment and their Qelos instance.

## Overview

The CLI provides powerful commands to:
- **Create** new plugin projects with scaffolding
- **Get** preview files that would be pushed without actually pushing them
- **Pull** resources from your Qelos instance to work locally
- **Push** local changes back to your Qelos instance
- **Generate** IDE-specific rules files for better AI assistance
- Manage components, blueprints, configurations, integrations, connections, plugins, and blocks

## Installation

### Global Installation

Install the CLI globally using npm:

```bash
npm install -g @qelos/plugins-cli
```

After installation, the CLI will be available as both `qelos` and `qplay` commands:

```bash
qelos --version
qplay --version
```

## Configuration

### Environment Variables

The CLI requires the following environment variables to connect to your Qelos instance:

| Variable | Description | Default |
|----------|-------------|---------|
| `QELOS_URL` | Your Qelos instance URL | `http://localhost:3000` |
| `QELOS_USERNAME` | Your Qelos username | `test@test.com` |
| `QELOS_PASSWORD` | Your Qelos password | `admin` |

You can set these in your shell profile or use a `.env` file:

```bash
export QELOS_URL=https://your-qelos-instance.com
export QELOS_USERNAME=your-username
export QELOS_PASSWORD=your-password
```

## Quick Start

```bash
# Install the CLI
npm install -g @qelos/plugins-cli

# Create a new plugin
qplay create my-plugin

# Pull components from your Qelos instance
qelos pull components ./my-components

# Pull blueprints
qelos pull blueprints ./my-blueprints

# Pull configurations
qelos pull config ./my-configs

# Pull integrations & connections
qelos pull integrations ./my-integrations
qelos pull connections ./my-connections

# Generate IDE rules for better AI assistance
qelos generate rules all

# Preview what will be pushed
qelos get staged .
qelos get committed .

# Make changes locally

# Push changes back to Qelos
qelos push components ./my-components
qelos push blueprints ./my-blueprints
qelos push config ./my-configs
qelos push integrations ./my-integrations
qelos push connections ./my-connections
```

## Commands

<div class="vp-features">
  <div class="vp-feature">
    <h3><a href="/cli/create">Create</a></h3>
    <p>Create a new plugin project with all necessary scaffolding and configuration files.</p>
  </div>
  <div class="vp-feature">
    <h3><a href="/cli/get">Get</a></h3>
    <p>Preview files that would be pushed to your Qelos instance without actually pushing them.</p>
  </div>
  <div class="vp-feature">
    <h3><a href="/cli/pull">Pull</a></h3>
    <p>Pull resources from your Qelos instance to your local filesystem for development.</p>
  </div>
  <div class="vp-feature">
    <h3><a href="/cli/push">Push</a></h3>
    <p>Push local resources back to your Qelos instance to update or create new items.</p>
  </div>
  <div class="vp-feature">
    <h3><a href="/cli/generate">Generate Rules</a></h3>
    <p>Generate IDE-specific rules files to help AI assistants understand your Qelos project structure.</p>
  </div>
</div>

<style>
.vp-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin: 2rem 0;
}

.vp-feature {
  background-color: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s;
  border: 1px solid var(--vp-c-divider);
}

.vp-feature:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: var(--vp-c-brand);
}

.vp-feature h3 {
  margin-top: 0;
  font-size: 1.15rem;
  font-weight: 600;
}

.vp-feature p {
  margin-bottom: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}
</style>

## Use Cases

### Local Development

The CLI enables you to:
- Work on components locally with your preferred IDE and tools
- Use version control (Git) for your components
- Collaborate with team members on component development
- Test components locally before deploying to production

### Backup and Migration

```bash
# Backup all resources from production
qelos pull components ./backups/components-$(date +%Y%m%d)
qelos pull blueprints ./backups/blueprints-$(date +%Y%m%d)
qelos pull config ./backups/configs-$(date +%Y%m%d)

# Preview what will be migrated
qelos get staged ./backups/components-20241109
qelos get staged ./backups/blueprints-20241109

# Migrate to a new instance
export QELOS_URL=https://new-instance.com
qelos push components ./backups/components-20241109
qelos push blueprints ./backups/blueprints-20241109
qelos push config ./backups/configs-20241109
```

## Help

View all available commands and options:

```bash
qelos --help
qplay --help
```

View help for a specific command:

```bash
qelos create --help
qelos get --help
qelos pull --help
qelos push --help
qelos generate --help
```

## Troubleshooting

### Authentication Issues

If you encounter authentication errors:

1. Verify your environment variables are set correctly
2. Ensure your credentials have the necessary permissions
3. Check that your Qelos instance URL is accessible

### Connection Issues

If the CLI cannot connect to your Qelos instance:

1. Verify the `QELOS_URL` is correct and accessible
2. Check your network connection
3. Ensure your Qelos instance is running

### File Permission Issues

If you encounter file permission errors:

1. Ensure you have write permissions in the target directory
2. Check that the directory path is valid
3. Try using an absolute path instead of a relative path

## Related Resources

- [SDK Installation](/sdk/installation) - Install the Qelos SDK for programmatic access
- [Plugin Development](/plugins/create) - Learn how to create plugins
- [Components](/pre-designed-frontends/components/) - Learn about Qelos components
