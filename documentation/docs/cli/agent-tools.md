---
title: Agent Tools (Custom clientTools)
editLink: true
---

# Agent Tools (Custom `clientTools`)

The `qelos agent` command can expose **client-side tools** to the AI model.

These tools run **locally on the machine where you execute the CLI** (not on the server), and are only used in:

- streaming mode: `qelos agent ... --stream`
- interactive mode: `qelos agent ... --interactive`

Tools are implemented in `tools/cli/services/agent/tools.mjs` and executed from the stream loop in `tools/cli/controllers/agent.mjs`.

---

## Enabling tools

Tools can be enabled from two places:

1. **CLI flag** `--tools` (built-in tools only)
2. **Config** `qelos.config.json` → `agents[agentNameOrId].clientTools`
   - can include built-in tool names
   - can include **custom tool objects**

The CLI merges both lists and deduplicates by tool name.

---

## Built-in tools (quick reference)

Built-in tools are predefined in `BUILTIN_TOOLS`.

| Tool | Description | Args |
|------|-------------|------|
| `bash` | Run a shell command | `{ command: string }` |
| `node` | Run Node.js code | `{ code: string }` |
| `read` | Read a file | `{ path: string, startLine?: number, endLine?: number }` |
| `write` | Write a file | `{ path: string, content: string }` |
| `writeInLine` | Insert content at line | `{ path: string, line: number, content: string }` |
| `patch` | Replace a text block in a file | `{ path: string, search: string, replace: string }` |
| `removeLines` | Remove line range | `{ path: string, startLine: number, endLine: number }` |

---

## The `patch` tool

The `patch` tool is a **str_replace equivalent** — it replaces a specific block of text in a file by exact string matching. This is the recommended way to make targeted edits: safer and more token-efficient than rewriting entire files with `write`.

### Usage

```json
{ "path": "src/app.js", "search": "old code block", "replace": "new code block" }
```

| Arg | Type | Description |
|-----|------|-------------|
| `path` | `string` (required) | File path (relative to cwd or absolute) |
| `search` | `string` (required) | The exact text block to find — must match including whitespace and indentation |
| `replace` | `string` (required) | Replacement text. Use `""` to delete the matched block |

### Behaviour

- **Exact matching** — the search string must appear verbatim in the file (including spaces, tabs, and newlines).
- **Uniqueness check** — if the search string matches more than one location, the tool returns an error asking the caller to include more surrounding context.
- **Error recovery** — when the search string is not found, the tool returns a preview of the file (first/last 10 lines) to help the AI fix its next attempt.
- **Atomic** — the file is only written if a single unique match is found.

### When to use `patch` vs other tools

| Scenario | Recommended tool |
|----------|-----------------|
| Replace specific code block | `patch` |
| Create a brand-new file | `write` |
| Insert lines without replacing anything | `writeInLine` |
| Delete lines by number | `removeLines` |
| Complete file rewrite | `write` |

---

## Creating custom tools (via `clientTools`)

A **custom tool** is an object inside `agents[...].clientTools`.

At minimum, it must have:

- `name` (required)

In practice, you should also provide:

- `description` (recommended): shown to the model to help it decide when to call the tool
- `properties` or `schema`: describes the tool arguments the model should pass
- `handler`: tells the CLI how to execute the tool locally

### Custom tool object shape

```json
{
  "name": "<toolName>",
  "description": "<what the tool does>",
  "properties": {
    "<argName>": {
      "type": "string",
      "description": "..."
    }
  },
  "handler": {
    "bash": "<bash script/command>",
    "injectArgsAs": "env"
  }
}
```

The CLI reads this object in `buildClientTools(...)` and:

1. Builds the JSON schema sent to the backend:
   - If you provide `schema`, it uses it as-is.
   - Else if you provide `properties`, it builds:
     - `schema = { "type": "object", "properties": <properties> }`
2. Builds a runnable handler:
   - If `handler` is an object with a `bash` key, the CLI creates a handler using `createCustomToolHandler(name, handler)`.

---

## The `handler` (bash-backed)

Currently, the supported config-based custom handler is:

```json
"handler": {
  "bash": "...",
  "injectArgsAs": "env" | "argv" | "both"
}
```

### `handler.bash`

This is the bash command/script that will be executed locally using:

- `shell: '/bin/bash'`
- `cwd: process.cwd()`

So paths are relative to where you run `qelos agent`.

You can point it to an executable script:

```json
"bash": "./scripts/my-tool.sh"
```

Or run an inline bash command (be careful with quoting):

```json
"bash": "echo \"Hello\""
```

### `handler.injectArgsAs`

Controls how the tool-call arguments are passed to your bash script.

#### 1) `injectArgsAs: "env"` (default)

Each argument is injected as an **uppercase environment variable**.

Example tool call args:

```json
{ "path": "README.md", "pattern": "TODO" }
```

Your script receives:

- `PATH=README.md`
- `PATTERN=TODO`

In bash:

```bash
#!/usr/bin/env bash
set -euo pipefail

grep -n "$PATTERN" "$PATH"
```

#### 2) `injectArgsAs: "argv"`

The CLI appends **one argument** to your bash command containing the tool args as JSON.

Important detail: the CLI **double-stringifies** the JSON:

- it appends `JSON.stringify(JSON.stringify(args))`

So the argv value looks like a JSON string containing JSON.

If you want to parse it in bash, a common pattern is:

```bash
#!/usr/bin/env bash
set -euo pipefail

# $1 is a JSON string (that itself contains JSON)
ARGS_JSON=$(node -e 'console.log(JSON.parse(process.argv[1]))' "$1")

# Now parse fields from ARGS_JSON (using node/jq/etc.)
PATH_VALUE=$(node -e 'const a=JSON.parse(process.argv[1]); console.log(a.path)' "$ARGS_JSON")

echo "path=$PATH_VALUE"
```

If you’re already using `jq`, you can also do:

```bash
ARGS_JSON=$(node -e 'console.log(JSON.parse(process.argv[1]))' "$1")
echo "$ARGS_JSON" | jq .
```

#### 3) `injectArgsAs: "both"`

Uses both `env` and `argv` injection.

---

## Full example: custom tool in `qelos.config.json`

This example adds a tool named `grepFile` that searches for a pattern inside a file.

### 1) Create the script

Create `./scripts/grep-file.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Injected by the CLI (injectArgsAs: env)
# - PATH: file path
# - PATTERN: search pattern

grep -n "$PATTERN" "$PATH"
```

Make it executable:

```bash
chmod +x ./scripts/grep-file.sh
```

### 2) Register the tool in config

In `qelos.config.json`:

```json
{
  "agents": {
    "code-wizard": {
      "stream": true,
      "clientTools": [
        {
          "name": "grepFile",
          "description": "Search for a text pattern in a file and return matching lines.",
          "properties": {
            "path": { "type": "string", "description": "Path to the file to search" },
            "pattern": { "type": "string", "description": "Text/regex to search for" }
          },
          "handler": {
            "bash": "./scripts/grep-file.sh",
            "injectArgsAs": "env"
          }
        }
      ]
    }
  }
}
```

### 3) Run the agent

```bash
qelos agent code-wizard --stream --message "Search for TODOs in README.md using grepFile"
```

If the model decides to call `grepFile`, the CLI will execute your script locally and feed the tool output back into the conversation.

---

## Notes / gotchas

- **Security:** custom tools execute locally. Treat prompts as code execution requests.
- **Name collisions:** if a custom tool uses the same name as a built-in tool, the last one inserted into the tool map wins.
- **Output truncation:** the CLI truncates tool output in the terminal unless you pass `--verbose`.
- **Argument casing:** env injection uppercases keys (`path` → `PATH`).
