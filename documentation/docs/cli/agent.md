---
title: Agent Command
editLink: true
---

# Agent Command

The `qelos agent` command allows you to interact with AI agents using the Qelos SDK directly from your command line. It provides a powerful interface for chatting with AI integrations, maintaining conversation history, and exporting responses.

## Overview

The agent command enables you to:
- **Chat with AI integrations** using either ObjectIds or integration names
- **Maintain conversation history** with automatic context management
- **Stream responses** in real-time for better user experience
- **Export responses** to files in various formats
- **Use conversation threads** for organized dialogues
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
| `--stream` | `-s` | boolean | Use streaming mode for real-time responses |
| `--json` | `-j` | boolean | Output in JSON format |
| `--log` | `-l` | string | Log file to maintain conversation history |
| `--export` | `-e` | string | Export response content to specified file |
| `--thread` | `-t` | string | Thread ID for conversation continuity |
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
qelos agent moshe --message "Hello"
```

When using a name, the command automatically:
- Searches for an `integrations` folder in the current directory and up to 5 parent directories
- Reads all `.integration.json` files
- Matches the `trigger.details.name` field (case-insensitive)
- Uses the found integration's `_id` for the API call

## Examples

### Basic Usage

```bash
# Using integration name
qelos agent moshe --message "Hello, how are you?"

# Using ObjectId
qelos agent 692876602b6e9881b2311514 --message "Hello"

# Reading from stdin
echo "What's the weather?" | qelos agent moshe
```

### Streaming Mode

```bash
# Real-time streaming responses
qelos agent moshe --stream --message "Tell me a story"

# Streaming with JSON output
qelos agent moshe --stream --json --message "Write code"
```

### Conversation Logging

```bash
# Start a conversation with logging
echo "My name is David" | qelos agent moshe --log conversation.json

# Continue the conversation (context is maintained)
echo "What's my name?" | qelos agent moshe --log conversation.json

# Works with streaming too
echo "Remember this" | qelos agent moshe --log chat.json --stream
```

### Response Exporting

```bash
# Export response to file
qelos agent moshe --message "Write a poem" --export poem.txt

# Export JSON response
qelos agent moshe --message "API info" --json --export api.json

# Combine logging and exporting
qelos agent moshe --log chat.json --export response.md --message "Summary"
```

### Thread Support

```bash
# Use specific thread ID
qelos agent moshe --thread thread-123 --message "Continue conversation"

# Combine with other options
qelos agent moshe --thread thread-123 --log chat.json --export result.md
```

### Verbose Mode

```bash
# See detailed information including name resolution
qelos agent moshe --verbose --message "Hello"
```

Output example:
```
Looking for integration with name: moshe
Found integration: moshe (692876602b6e9881b2311514)
[DEBUG] Initializing Qelos SDK...
```

## Features

### Smart Integration Resolution
- **Automatic Detection**: Distinguishes between ObjectIds and names
- **Case-Insensitive**: `moshe`, `MOSHE`, and `Moshe` all work
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

## Advanced Usage

### Pipeline Operations

```bash
# Chain commands
echo "Generate report" | qelos agent moshe --stream | tee response.txt

# Multiple conversations
for name in moshe avi rami; do
  echo "Hello $name" | qelos agent "$name" --log "${name}-chat.json"
done
```

### Script Integration

```bash
#!/bin/bash
# chat.sh - Simple chat script

INTEGRATION="moshe"
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
2. **Log Important Conversations**: Use `--log` for conversations you might need to reference
3. **Export Key Responses**: Use `--export` for important outputs like code or documentation
4. **Verbose Mode for Debugging**: Use `--verbose` when troubleshooting integration issues
5. **Streaming for Long Responses**: Use `--stream` for better user experience with lengthy responses

## Integration File Structure

The command searches for integration files with this structure:

```json
{
  "_id": "692876602b6e9881b2311514",
  "trigger": {
    "details": {
      "name": "moshe"
    }
  }
}
```

### Directory Layout

```
project/
├── integrations/
│   ├── moshe.integration.json
│   ├── avi.integration.json
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
