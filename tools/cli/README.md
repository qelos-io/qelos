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

Pull resources from your Qelos instance to your local filesystem. This allows you to work on components, blueprints, configs, plugins, blocks, integrations, and connections locally.

**Syntax:**
```bash
qelos pull <type> <path>
```

**Arguments:**
- `type` - Type of resource to pull (e.g., `components`, `plugins`, `integrations`, `connections`, `blueprints`)
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

Push local resources to your Qelos instance. This allows you to update or create components, blueprints, configs, plugins, blocks, integrations, and connections from your local filesystem.

**Syntax:**
```bash
qelos push <type> <path>
```

**Arguments:**
- `type` - Type of resource to push (e.g., `components`, `plugins`, `integrations`, `connections`, `blueprints`)
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

### Agent

Interact with AI agents using the Qelos SDK directly from your command line.

**Syntax:**
```bash
qelos agent [integrationId] [options]
```

**Arguments:**
- `integrationId` - Integration ObjectId or name (case-insensitive)

**Key Options:**
- `-m, --message` - Message to send (or pipe from stdin)
- `-s, --stream` - Real-time streaming responses
- `-j, --json` - JSON output format
- `-l, --log` - Maintain conversation history in file
- `-e, --export` - Save response to file
- `-t, --thread` - Thread ID for conversation continuity
- `-V, --verbose` - Detailed logging

**Integration Identification:**

You can specify integrations in two ways:

1. **Using ObjectId** (24-character hex string):
   ```bash
   qelos agent 692876602b6e9881b2311514 --message "Hello"
   ```

2. **Using Integration Name** (case-insensitive):
   ```bash
   qelos agent moshe --message "Hello"
   ```

When using a name, the command automatically searches for an `integrations` folder in the current directory and up to 5 parent directories, looking for `.integration.json` files with matching `trigger.details.name` fields.

**Examples:**

Basic usage with integration name:
```bash
qelos agent moshe --message "Hello, how are you?"
```

Using ObjectId:
```bash
qelos agent 692876602b6e9881b2311514 --message "Hello"
```

From stdin:
```bash
echo "What's the weather?" | qelos agent moshe
```

Streaming with export:
```bash
qelos agent moshe --stream --export response.txt --message "Tell me a story"
```

Conversation logging (maintains context across messages):
```bash
echo "My name is David" | qelos agent moshe --log chat.json
echo "What's my name?" | qelos agent moshe --log chat.json
```

JSON output:
```bash
qelos agent moshe --json --export api.json --message "API info"
```

Thread support:
```bash
qelos agent moshe --thread thread-123 --message "Continue conversation"
```

Verbose mode (shows name resolution process):
```bash
qelos agent moshe --verbose --message "Show me your verbose output"
```

**Features:**
- **Smart Integration Resolution**: Use either ObjectIds or integration names
- **Conversation History**: Maintain context across multiple messages with `--log`
- **Streaming Support**: Real-time response streaming with `--stream`
- **Export Options**: Save responses in various formats with `--export`
- **Thread Support**: Continue specific conversation threads with `--thread`
- **Flexible Input**: Use `--message` flag or pipe from stdin

**Log File Format:**
Conversation logs are stored as JSON arrays:
```json
[
  {
    "role": "user",
    "content": "Hello, my name is David"
  },
  {
    "role": "assistant", 
    "content": "Hello David! Nice to meet you."
  }
]
```

**Error Handling:**
If an integration name isn't found, you'll see:
```
Error: Could not find integration with name "nonexistent"
Make sure:
1. The integration name matches exactly (case-insensitive)
2. You are in a project directory with an "integrations" folder
3. The integration file has a .integration.json extension
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

### Integrations

- Pulled integrations are stored as `.integration.json` files that exclude server-only fields such as `tenant`, `user`, `created`, `updated`, and `__v`.  
- When pushing, the CLI automatically recalculates backend-only properties (like `kind`) so you do not need to keep them in local files.

### Connections (Integration Sources)

Connections (integration sources) are now fully supported via `qelos pull connections <path>` and `qelos push connections <path>`.

- Each connection is stored as `<name>.connection.json` containing `name`, `kind`, `labels`, `metadata`, and an `authentication` placeholder:

```json
{
  "_id": "64f1...",
  "name": "OpenAI",
  "kind": "openai",
  "labels": ["ai"],
  "metadata": { "defaultModel": "gpt-4o" },
  "authentication": {
    "$var": "INTEGRATION_AUTH_OPENAI"
  }
}
```

- At push time, the CLI reads the referenced environment variable (e.g., `INTEGRATION_AUTH_OPENAI`) which must contain a JSON string with the real credentials:

```bash
export INTEGRATION_AUTH_OPENAI='{"token":"sk-..."}'
```

- If the env var is missing, the CLI skips updating the secure authentication payload and only syncs metadata.
- When new connections are created, the CLI persists the returned `_id` so future pushes update the same record.

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
