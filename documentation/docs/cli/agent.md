---
title: Agent Command
editLink: true
---

# Agent Command

The `qelos agent` command allows you to interact with AI agents using the Qelos SDK directly from your command line. It provides a powerful interface for chatting with AI integrations, maintaining conversation history, exporting responses, and (optionally) enabling local **client-side tools** that the agent can call.

## Overview

The agent command enables you to:
- **Chat with AI integrations** using either ObjectIds or integration names
- **Maintain conversation history** with automatic context management
- **Stream responses** in real-time for better user experience
- **Export responses** to files in various formats
- **Use conversation threads** for organized dialogues
- **Inject context** into a conversation from inline JSON or a file
- **Enable local tools** (like reading/writing files or running shell commands) that the agent can invoke
- **Flexible input** via command line or stdin

## Syntax

```bash
qelos agent [integrationId] [options]
```

## Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `integrationId` | string | Integration ObjectId or name (case-insensitive) |

## Options

| Option | Alias | Type | Description |
|--------|-------|------|-------------|
| `--message` | `-m` | string | Message to send (if not provided, reads from stdin) |
| `--interactive` | `-i` | boolean | Keep the session alive for multi-turn conversation (implies `--stream`) |
| `--stream` | `-s` | boolean | Use streaming mode for real-time responses |
| `--json` | `-j` | boolean | Output in JSON format |
| `--log` | `-l` | string | Log file to maintain conversation history |
| `--export` | `-e` | string | Export response content to specified file |
| `--thread` | `-t` | string | Thread ID for conversation continuity |
| `--context` | `-c` | string | JSON string of context data to inject into the conversation (e.g. `'{"key":"value"}'`) |
| `--context-file` |  | string | Path to a JSON file containing context data to inject into the conversation |
| `--tools` |  | array | Enable built-in local tools for the agent. Can specify multiple: `--tools bash read` |
| `--save` | `-S` | boolean | Save current options to `qelos.config.json` |
| `--verbose` | `-V` | boolean | Run with verbose logging |

## Integration Identification

You can specify integrations in two ways:

### 1. Using ObjectId
A 24-character hexadecimal string that uniquely identifies the integration:

```bash
qelos agent 692876602b6e9881b2311514 --message "Hello"
```

### 2. Using Integration Name
A human-readable name that matches the `trigger.details.name` field in the integration configuration:

```bash
qelos agent code-wizard --message "Hello"
```

When using a name, the command automatically:
- Searches for an `integrations` folder in the current directory and up to 5 parent directories
- Reads all `.integration.json` files
- Matches the `trigger.details.name` field (case-insensitive)
- Uses the found integration's `_id` for the API call

## Client-side tools (`--tools`)

The agent can optionally be given access to **local tools** implemented by the CLI (in `tools/cli/services/agent/tools.mjs`).

### Enabling tools

```bash
# Enable multiple tools
qelos agent code-wizard --tools bash read --message "List files and show package.json"

# Comma-separated also works
qelos agent code-wizard --tools bash,read --message "List files and show package.json"
```

### Available built-in tools

These are the built-in tool names you can pass to `--tools`:

| Tool | What it does | Typical use |
|------|--------------|-------------|
| `bash` | Execute a shell command in the current working directory and return stdout/stderr | `ls`, `git diff`, `grep`, running scripts |
| `node` | Execute Node.js code (written to a temporary `.mjs` file) and return stdout/stderr | quick parsing/transforms, JSON manipulation |
| `read` | Read a file and return its contents (supports `startLine`/`endLine` slicing) | inspect project files, configs, logs |
| `write` | Write a full file (creates parent directories if needed) | generate/update files deterministically |
| `writeInLine` | Insert content into a file at a specific line index (0-indexed) without replacing the whole file | patch files, insert blocks |
| `removeLines` | Remove a range of lines from a file (0-indexed) | delete sections safely |

### Tool schemas (arguments)

The agent calls tools with structured arguments.

#### `bash`
- Args: `{ command: string }`

#### `node`
- Args: `{ code: string }`

#### `read`
- Args: `{ path: string, startLine?: number, endLine?: number }`
  - `startLine` is 0-indexed (default: `0`)
  - `endLine` is 0-indexed **and exclusive** (default: `-1` meaning EOF)

#### `write`
- Args: `{ path: string, content: string }`

#### `writeInLine`
- Args: `{ path: string, line: number, content: string }`
  - `line` is 0-indexed

#### `removeLines`
- Args: `{ path: string, startLine: number, endLine: number }`
  - both are 0-indexed
  - `endLine` is inclusive

### Notes / gotchas

- Tool output is **truncated in the terminal by default**; set `--verbose` to print full tool output.
- Unknown tool names passed to `--tools` will be ignored with a warning, and the CLI will print the list of available tools.
- Tools can also be enabled via config (see “Config File Defaults”).

## Examples

### Basic Usage

```bash
# Using integration name
qelos agent code-wizard --message "Hello, how are you?"

# Using ObjectId
qelos agent 692876602b6e9881b2311514 --message "Hello"

# Reading from stdin
echo "What's the weather?" | qelos agent code-wizard
```

### Streaming Mode

```bash
# Real-time streaming responses
qelos agent code-wizard --stream --message "Tell me a story"

# Streaming with JSON output
qelos agent code-wizard --stream --json --message "Write code"
```

### Conversation Logging

```bash
# Start a conversation with logging
echo "My name is David" | qelos agent code-wizard --log conversation.json

# Continue the conversation (context is maintained)
echo "What's my name?" | qelos agent code-wizard --log conversation.json

# Works with streaming too
echo "Remember this" | qelos agent code-wizard --log chat.json --stream
```

### Response Exporting

```bash
# Export response to file
qelos agent code-wizard --message "Write a poem" --export poem.txt

# Export JSON response
qelos agent code-wizard --message "API info" --json --export api.json

# Combine logging and exporting
qelos agent code-wizard --log chat.json --export response.md --message "Summary"
```

### Interactive Mode

Use `--interactive` (or `-i`) to start a live, multi-turn conversation that keeps the session open until you choose to end it. Streaming is enabled automatically.

```bash
# Start an interactive session
qelos agent code-wizard -i

# With an opening message, then continue in the loop
qelos agent code-wizard -i --message "Let's talk about my API design"

# Combined with logging (full history saved after every turn)
qelos agent code-wizard -i --log conversation.json

# With a specific thread for continuity across sessions
qelos agent code-wizard -i --thread thread-123 --log chat.json
```

Inside an interactive session:
- Type your message and press **Enter** to send.
- Press **Enter** on an empty line to finish a multi-line message.
- Type `/exit` or press **Ctrl+C** to end the conversation.

### Thread Support

```bash
# Use specific thread ID
qelos agent code-wizard --thread thread-123 --message "Continue conversation"

# Combine with other options
qelos agent code-wizard --thread thread-123 --log chat.json --export result.md
```

### Verbose Mode

```bash
# See detailed information including name resolution
qelos agent code-wizard --verbose --message "Hello"
```

Output example:
```
Looking for integration with name: code-wizard
Found integration: code-wizard (692876602b6e9881b2311514)
[DEBUG] Initializing Qelos SDK...
```

## Features

### Interactive Mode
- **Multi-Turn Loop**: Keeps the session alive so you can have a back-and-forth conversation without re-running the command
- **Implied Streaming**: Automatically enables streaming for real-time output
- **Multi-Line Input**: Press Enter on an empty line to send a multi-line message
- **Graceful Exit**: Type `/exit` or press Ctrl+C to end the session
- **Full Flag Compatibility**: Works alongside `--log`, `--export`, `--thread`, and `--save`

### Smart Integration Resolution
- **Automatic Detection**: Distinguishes between ObjectIds and names
- **Case-Insensitive**: `code-wizard`, `CODE-WIZARD`, and `Code-Wizard` all work
- **Directory Search**: Finds `integrations` folder in current or parent directories
- **Clear Errors**: Helpful messages when integrations aren't found

### Conversation History
- **JSON Format**: Stores conversations as JSON arrays with role-based messages
- **Context Maintenance**: Automatically loads previous messages for continuity
- **Error Handling**: Graceful handling of corrupted or missing log files

Log file format:
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

### Streaming Support
- **Real-time Output**: See responses as they're generated
- **JSON Streaming**: Export streaming chunks as JSON arrays
- **Error Handling**: Robust error handling for network issues

### Export Options
- **Flexible Formats**: Works with both human-readable and JSON outputs
- **Directory Creation**: Automatically creates parent directories if needed
- **Content Types**:
  - Human-readable: Plain text content
  - JSON: Full API response objects or streaming chunks

## Config File Defaults

The agent command integrates with the [CLI config file](/cli/#config-file). When a `qelos.config.json` or `qelos.config.yaml` exists, agent-specific defaults are loaded automatically based on the `integrationId`.

For example, with this config file:

```json
{
  "agents": {
    "code-wizard": {
      "stream": true,
      "log": "./logs/code-wizard.log",
      "export": "./output/response.md"
    }
  }
}
```

Running `qelos agent code-wizard -m "Hello"` is equivalent to:

```bash
qelos agent code-wizard --stream --log ./logs/code-wizard.log --export ./output/response.md -m "Hello"
```

CLI flags always take precedence over config defaults. For example:

```bash
# Config has stream: true, but this disables it
qelos agent code-wizard --no-stream -m "Hello"
```

### Saving Defaults with `--save`

Use `--save` (`-S`) to persist the current command's options into `qelos.config.json`:

```bash
# Save preferences for the "code-wizard" agent
qelos agent code-wizard --json --export a.md --save
```

This creates or updates `qelos.config.json`:

```json
{
  "agents": {
    "code-wizard": {
      "json": true,
      "export": "a.md"
    }
  }
}
```

From now on, running `qelos agent code-wizard -m "Hello"` will automatically use `--json` and `--export a.md`.

The following options are saved: `thread`, `log`, `export`, `json`, `stream`, `tools`.  
Transient options like `--message` and `--save` itself are never saved.

Saving merges with existing config — other agents and settings are preserved:

```bash
# First agent
qelos agent code-wizard --stream --log code-wizard.log --save

# Second agent — code-wizard's config is preserved
qelos agent data-cruncher --json --export data-cruncher.md --save
```

Resulting `qelos.config.json`:

```json
{
  "agents": {
    "code-wizard": { "stream": true, "log": "code-wizard.log" },
    "data-cruncher": { "json": true, "export": "data-cruncher.md" }
  }
}
```

## Advanced Usage

### Pipeline Operations

```bash
# Chain commands
echo "Generate report" | qelos agent code-wizard --stream | tee response.txt

# Multiple conversations
for name in code-wizard data-cruncher summarizer; do
  echo "Hello $name" | qelos agent "$name" --log "${name}-chat.json"
done
```

### Script Integration

```bash
#!/bin/bash
# chat.sh - Simple chat script

INTEGRATION="code-wizard"
LOG_FILE="conversation.json"

echo "Starting chat with $INTEGRATION..."
while true; do
  read -p "You: " message
  if [ "$message" = "quit" ]; then
    break
  fi
  
  echo "$message" | qelos agent "$INTEGRATION" --log "$LOG_FILE"
done
```

## Error Handling

### Integration Not Found
```
Error: Could not find integration with name "nonexistent"
Make sure:
1. The integration name matches exactly (case-insensitive)
2. You are in a project directory with an "integrations" folder
3. The integration file has a .integration.json extension
```

### File Operation Errors
- Warnings are displayed for log/export file issues
- The command continues execution when possible
- Verbose mode provides detailed error information

## Tips and Best Practices

1. **Use Names for Readability**: Integration names are more memorable than ObjectIds
2. **Interactive for Conversations**: Use `-i` when you want a back-and-forth session without re-running the command
3. **Log Important Conversations**: Use `--log` for conversations you might need to reference
4. **Export Key Responses**: Use `--export` for important outputs like code or documentation
5. **Verbose Mode for Debugging**: Use `--verbose` when troubleshooting integration issues
6. **Streaming for Long Responses**: Use `--stream` for better user experience with lengthy responses
7. **Save Repetitive Options**: Use `--save` once to avoid typing the same flags every time
8. **Per-Agent Config**: Different agents can have different saved defaults in the same config file

## Integration File Structure

The command searches for integration files with this structure:

```json
{
  "_id": "692876602b6e9881b2311514",
  "trigger": {
    "details": {
      "name": "code-wizard"
    }
  }
}
```

### Directory Layout

```
project/
├── integrations/
│   ├── code-wizard.integration.json
│   ├── data-cruncher.integration.json
│   └── ...
└── logs/
    ├── conversation.json
    └── ...
```

## Troubleshooting

### Common Issues

1. **Integration Not Found**
   - Check you're in the correct directory
   - Verify the integration name spelling
   - Ensure the file ends with `.integration.json`

2. **Permission Errors**
   - Check write permissions for log/export directories
   - The command creates directories automatically when possible

3. **Streaming Issues**
   - Network problems may interrupt streaming
   - Try non-streaming mode if streaming fails

### Verbose Output

Use `--verbose` to see:
- Integration name resolution process
- SDK initialization details
- File operation warnings
- Full error stack traces

## Related Resources

- [CLI Overview](/cli/) - Main CLI documentation
- [Pull Command](/cli/pull) - Pull integrations to work with them locally
- [SDK Installation](/sdk/installation) - Programmatic access to Qelos features
- [AI SDK Operations](/sdk/ai_operations) - Learn about AI operations in the SDK
- [Token Usage Tracking](/ai/token-usage-tracking) - Learn about AI usage tracking
