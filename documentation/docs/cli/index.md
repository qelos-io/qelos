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
- **Agent** interact with AI agents via command line with conversation support
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

## Global Options

These options are available for all commands:

| Option | Alias | Type | Description |
|--------|-------|------|-------------|
| `--verbose` | `-V` | boolean | Run with verbose logging |
| `--env` | `-e` | string | Load `.env.[ENV]` file (e.g. `--env production`) |
| `--config` | `-C` | string | Path to config file (auto-discovers by default) |
| `--save` | `-S` | boolean | Save current command options to `qelos.config.json` |
| `--help` | | boolean | Show help |
| `--version` | | boolean | Show version |

## Configuration

The CLI supports three layers of configuration, applied in this priority order:
1. **CLI flags** (highest priority)
2. **Environment variables**
3. **Config file** (`qelos.config.json` / `qelos.config.yaml`)
4. **Built-in defaults** (lowest priority)

### Environment Variables

The CLI requires the following environment variables to connect to your Qelos instance:

| Variable | Description | Default |
|----------|-------------|--------|
| `QELOS_URL` | Your Qelos instance URL | `http://localhost:3000` |
| `QELOS_USERNAME` | Your Qelos username | `test@test.com` |
| `QELOS_PASSWORD` | Your Qelos password | `admin` |

You can set these in your shell profile or use a `.env` file:

```bash
export QELOS_URL=https://your-qelos-instance.com
export QELOS_USERNAME=your-username
export QELOS_PASSWORD=your-password
```

### Automatic `.env` Loading

The CLI automatically loads `.env` files from the current working directory. No flags are needed — if a `.env` file exists, it is loaded before any command runs.

The loading order (first file sets the value, later files do not override):

1. `.env.local`
2. `.env`

Use the `--env` flag to load environment-specific files:

```bash
# Loads: .env.production.local → .env.production → .env.local → .env
qelos --env production push components ./my-components

# Loads: .env.staging.local → .env.staging → .env.local → .env
qelos --env staging agent code-wizard -m "Hello"
```

Example `.env` file:
```bash
QELOS_URL=https://my-instance.qelos.io
QELOS_USERNAME=admin@company.com
QELOS_PASSWORD=secret
```

### Config File

The CLI auto-discovers a config file from the current working directory. The following filenames are searched in order:

1. `qelos.config.json`
2. `qelos.config.yaml`
3. `qelos.config.yml`

You can also specify an explicit path with `--config`:

```bash
qelos --config ./my-config.json agent code-wizard -m "Hello"
```

#### Config File Schema

::: code-group
```json [qelos.config.json]
{
  "qelosUrl": "https://my-instance.qelos.io",
  "agents": {
    "code-wizard": {
      "thread": "persistent-thread-id",
      "log": "./logs/code-wizard.log",
      "export": "./output/response.md",
      "json": false,
      "stream": true
    },
    "data-agent": {
      "json": true,
      "stream": false
    }
  }
}
```

```yaml [qelos.config.yaml]
qelosUrl: https://my-instance.qelos.io
agents:
  code-wizard:
    thread: persistent-thread-id
    log: ./logs/code-wizard.log
    export: ./output/response.md
    json: false
    stream: true
  data-agent:
    json: true
    stream: false
```
:::

| Key | Type | Description |
|-----|------|-------------|
| `qelosUrl` | string | Qelos instance URL (overridden by `QELOS_URL` env var) |
| `agents` | object | Per-agent default options, keyed by agent name or ID |
| `agents[name].thread` | string | Default thread ID |
| `agents[name].log` | string | Default log file path |
| `agents[name].export` | string | Default export file path |
| `agents[name].json` | boolean | Default JSON output mode |
| `agents[name].stream` | boolean | Default streaming mode |

Config values are used as defaults — CLI flags always take precedence.

### Saving Config with `--save`

Use the `--save` (`-S`) flag to persist the current command's options into `qelos.config.json`:

```bash
# Creates/updates qelos.config.json with: {agents: {code-wizard: {json: true, export: "a.md"}}}
qelos agent code-wizard --json --export a.md --save

# Next time, just run — saved defaults apply automatically
qelos agent code-wizard -m "Hello"
```

The `--save` flag:
- **Creates** `qelos.config.json` if it doesn't exist
- **Merges** with existing config (preserves other agents and settings)
- **Only saves persistent options** (e.g. `thread`, `log`, `export`, `json`, `stream`) — transient options like `--message` are not saved

## Quick Start

```bash
# Install the CLI
npm install -g @qelos/plugins-cli

# Set up a .env file for your instance
echo 'QELOS_URL=https://my-instance.qelos.io' > .env
echo 'QELOS_USERNAME=admin@company.com' >> .env
echo 'QELOS_PASSWORD=secret' >> .env

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

# Push with hard flag to remove remote resources that don't exist locally
qelos push components ./my-components --hard
qelos push all ./my-project --hard

# Push to a different environment using --env
qelos --env production push components ./my-components

# Interact with AI agents
qelos agent code-wizard --message "Hello, how can you help me?"
echo "What's the weather?" | qelos agent weather-agent --stream
qelos agent assistant --log conversation.json --export response.md

# Save agent preferences for reuse
qelos agent code-wizard --stream --log chat.json --save
qelos agent code-wizard -m "Hello"  # uses saved defaults
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
    <p>Push local resources back to your Qelos instance to update or create new items. Use the <code>--hard</code> flag to remove remote resources that don't exist locally.</p>
  </div>
  <div class="vp-feature">
    <h3><a href="/cli/generate">Generate Rules</a></h3>
    <p>Generate IDE-specific rules files to help AI assistants understand your Qelos project structure.</p>
  </div>
  <div class="vp-feature">
    <h3><a href="/cli/agent">Agent</a></h3>
    <p>Interact with AI agents using the Qelos SDK with support for conversation history, streaming, and response export.</p>
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
qelos agent --help
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

- [Agent Command](/cli/agent) - Interact with AI agents via command line
- [SDK Installation](/sdk/installation) - Install the Qelos SDK for programmatic access
- [Plugin Development](/plugins/create) - Learn how to create plugins
- [Components](/pre-designed-frontends/components/) - Learn about Qelos components
- [Hard Push Flag](/cli/hard-push) - Learn about the --hard flag for synchronizing environments
- [Token Usage Tracking](/ai/token-usage-tracking) - Learn about AI usage tracking
