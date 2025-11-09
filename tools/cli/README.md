# Qelos CLI

A command-line interface to help you create and manage your Qelos plugins.

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

### Environment Variables

The CLI requires the following environment variables to connect to your Qelos instance:

- `QELOS_URL` - Your Qelos instance URL (default: `http://localhost:3000`)
- `QELOS_USERNAME` - Your Qelos username (default: `test@test.com`)
- `QELOS_PASSWORD` - Your Qelos password (default: `admin`)

You can set these in your shell profile or use a `.env` file:

```bash
export QELOS_URL=https://your-qelos-instance.com
export QELOS_USERNAME=your-username
export QELOS_PASSWORD=your-password
```

## Commands

### Create a new plugin

Create a new plugin project:

```bash
qplay create my-app
```

### Pull

Pull resources from your Qelos instance to your local filesystem. This allows you to work on components, plugins, integrations, and blueprints locally.

**Syntax:**
```bash
qelos pull <type> <path>
```

**Arguments:**
- `type` - Type of resource to pull (e.g., `components`, `plugins`, `integrations`, `blueprints`)
- `path` - Local directory path where resources will be saved

**Example - Pull Components:**
```bash
qelos pull components ./my-components
```

This command will:
1. Connect to your Qelos instance using the configured credentials
2. Fetch all components from the instance
3. Create the target directory if it doesn't exist
4. Save each component as a `.vue` file using its identifier as the filename
5. Display progress for each component pulled

**Output:**
```
Created directory: ./my-components
Found 5 components to pull
Pulled component: header-component
Pulled component: footer-component
Pulled component: sidebar-component
All 5 components pulled to ./my-components
```

### Push

Push local resources to your Qelos instance. This allows you to update or create components, plugins, integrations, and blueprints from your local filesystem.

**Syntax:**
```bash
qelos push <type> <path>
```

**Arguments:**
- `type` - Type of resource to push (e.g., `components`, `plugins`, `integrations`, `blueprints`)
- `path` - Local directory path containing the resources to push

**Example - Push Components:**
```bash
qelos push components ./my-components
```

This command will:
1. Connect to your Qelos instance using the configured credentials
2. Read all `.vue` files from the specified directory
3. For each file:
   - Check if a component with the same identifier exists
   - Update the existing component or create a new one
   - Display progress for each component

**Output:**
```
Pushing component: header-component
Component updated: header-component
Pushing component: new-component
Component pushed: new-component
All components pushed
```

### Workflow Example

A typical workflow for working with components:

```bash
# Pull components from Qelos to work on them locally
qelos pull components ./local-components

# Make changes to the .vue files in ./local-components

# Push the updated components back to Qelos
qelos push components ./local-components
```

## Help

View all available commands and options:

```bash
qelos --help
qplay --help
```

View help for a specific command:

```bash
qelos pull --help
qelos push --help
```
