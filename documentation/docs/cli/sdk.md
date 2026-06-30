---
title: SDK Command
editLink: true
---
# SDK Command

The `qelos sdk` command invokes the [Qelos Administrator SDK](/sdk/sdk_reference) directly from your terminal. It mirrors the SDK call chain as a flat path — no `await`, no parentheses, no JavaScript syntax.

## Overview

Use `qelos sdk` when you want to:

- **Script against your instance** without writing a Node.js file
- **Pipe JSON** from files or other commands into SDK method calls
- **Quickly inspect** data (users, blueprints, entities, events, workspaces, …)
- **Automate** admin tasks in shell scripts and CI pipelines

The CLI authenticates the same way as every other command (`.env`, `QELOS_API_TOKEN`, or username/password) and uses the administrator SDK surface.

## Syntax

```bash
qelos sdk <path...> [json-args...]
```

| Part | Description |
|------|-------------|
| `<path...>` | SDK path: properties and methods as space-separated tokens (or dot-joined segments) |
| `[json-args...]` | Optional trailing JSON objects/arrays passed to the final method |
| **stdin** | When stdin is piped, its contents become the final method argument |

## How paths map to SDK calls

Each token is one segment of the SDK chain. Properties are walked; methods consume the next token(s) as arguments and the path continues on the returned object.

| SDK (TypeScript) | CLI |
|------------------|-----|
| `await sdk.blueprints.getList()` | `qelos sdk blueprints getList` |
| `await sdk.blueprints.entitiesOf('todo').getList()` | `qelos sdk blueprints entitiesOf todo getList` |
| `await sdk.blueprints.entitiesOf('todo').create({ title: 'Buy milk' })` | `qelos sdk blueprints entitiesOf todo create '{"title":"Buy milk"}'` |
| `await sdk.entities('todo').getList({ status: 'open' })` | `qelos sdk entities todo getList '{"status":"open"}'` |
| `await sdk.users.getList({ username: 'ada' })` | `qelos sdk users getList '{"username":"ada"}'` |
| `await sdk.events.getList({ kind: 'auth' })` | `qelos sdk events getList '{"kind":"auth"}'` |

### Dot notation

Dot-separated segments are expanded automatically, so these are equivalent:

```bash
qelos sdk blueprints.entitiesOf todo getList
qelos sdk blueprints entitiesOf todo getList
```

Mix styles freely — use dots for namespace prefixes and spaces for method arguments.

### Argument parsing

Tokens are parsed intelligently:

| Token | Parsed as |
|-------|-----------|
| `todo` | string `"todo"` |
| `42` | number `42` |
| `true` / `false` | boolean |
| `'{"a":1}'` | JSON object `{ a: 1 }` |
| `'[1,2]'` | JSON array `[1, 2]` |

Trailing JSON tokens are peeled from the end of the path and passed to the terminal method. Multi-argument methods receive tokens in order:

```bash
# sdk.blueprints.entitiesOf('todo').update('abc123', { title: 'Updated' })
qelos sdk blueprints entitiesOf todo update abc123 '{"title":"Updated"}'
```

## Piping stdin

When stdin is not a TTY, its contents are parsed as JSON (or a primitive) and passed as the **sole argument** to the final method. This is ideal for large query objects or generated payloads:

```bash
# Pass filters from a file
cat query.json | qelos sdk users getList

# Inline heredoc
echo '{"status":"open"}' | qelos sdk entities todo getList

# Chain with jq
jq '.filters' request.json | qelos sdk events getList
```

CLI JSON args and stdin args are merged — stdin values are appended after any trailing JSON tokens on the command line.

## Output

Results are printed as pretty-printed JSON by default:

```bash
qelos sdk blueprints getList
```

```json
[
  {
    "identifier": "todo",
    "name": "Todo"
  }
]
```

Use `--compact` for single-line JSON (useful in scripts):

```bash
qelos sdk blueprints getList --compact
```

Primitive return values (`string`, `number`, `boolean`, `null`) are printed as plain text. `undefined` produces no output.

## Options

| Option | Type | Description |
|--------|------|-------------|
| `--compact` | boolean | Print JSON without pretty formatting (default: `false`) |

Global options (`--verbose`, `--env`, `--config`, `--global`) apply as usual. See [CLI Configuration](/cli/#configuration).

## Examples

### Blueprints and entities

```bash
# List all blueprints
qelos sdk blueprints getList

# List entities in a blueprint
qelos sdk blueprints entitiesOf todo getList

# Shorthand via sdk.entities()
qelos sdk entities todo getList

# Create an entity
qelos sdk blueprints entitiesOf todo create '{"title":"Buy milk","done":false}'

# Filtered query via stdin
echo '{"done":false}' | qelos sdk entities todo getList
```

### Users and workspaces (admin SDK)

```bash
qelos sdk users getList
qelos sdk adminWorkspaces getList
qelos sdk roles getExistingRoles
```

### Events

```bash
qelos sdk events getList '{"page":1,"kind":"auth"}'
```

### Shell scripting

```bash
# Capture output
IDS=$(qelos sdk blueprints getList --compact | jq -r '.[].identifier')

# Fail on error (non-zero exit code)
qelos sdk blueprints entitiesOf todo create '{"title":"Task"}' || exit 1

# Use in CI with API token
QELOS_API_TOKEN=ql_xxx qelos sdk users getList --compact
```

## Authentication

`qelos sdk` uses the same credentials as `pull`, `push`, and `agent`:

```bash
export QELOS_URL=https://your-instance.qelos.app
export QELOS_API_TOKEN=ql_your_token_here

qelos sdk blueprints getList
```

API token auth is recommended for scripts and CI. See [API Token Authentication](/cli/#api-token-authentication).

## Limitations

- **Streaming responses** (e.g. `sdk.ai.chat.stream`) are not supported — the command expects a resolved JSON-serializable value.
- **Interactive prompts** are not supported — pass all arguments on the command line or via stdin.
- The command runs the **administrator SDK** (`@qelos/sdk/administrator`), which exposes admin namespaces like `users`, `events`, and `manageBlueprints` in addition to the public SDK surface.

## Error handling

- Unknown path segments produce a clear error: `Unknown SDK member "foo"`.
- HTTP errors from the API print the status code and response body to stderr.
- The process exits with code `1` on failure (safe for `set -e` scripts).

## Related

- [SDK Reference](/sdk/sdk_reference) — full SDK API
- [Agent Command](/cli/agent) — conversational AI via CLI
- [CLI Configuration](/cli/#configuration) — credentials and environment setup
