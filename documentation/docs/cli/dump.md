---
title: Dump Command
editLink: true
---
# Dump Command

The `dump` command exports data from your Qelos instance to local files. It supports dumping **blueprint entities**, **users**, and **workspaces**. When used together, the dump commands enable cross-environment migration by replacing internal ObjectIDs with human-readable identifiers (usernames and workspace names).

## Recommended workflow

For a full cross-environment migration, dump in this order:

```bash
# 1. Dump users and workspaces first (creates lookup files)
qelos dump users
qelos dump workspaces

# 2. Then dump blueprint entities (auto-resolves ObjectIDs using the files above)
qelos dump blueprints
```

This ensures entity files contain usernames and workspace names instead of environment-specific ObjectIDs, making them portable across environments.

---

## dump blueprints

Downloads entity data from one or more blueprints and saves them as paginated JSON files.

### Usage

```bash
qelos dump blueprints [blueprints] [options]
```

### Arguments

| Argument | Description | Default |
| --- | --- | --- |
| `blueprints` | Blueprint identifiers to dump (comma-separated) or `all`. | `all` |

### Options

| Option | Description | Default |
| --- | --- | --- |
| `--filter` | JSON filter object added as query parameters (e.g. `'{"status":"active"}'`). | — |
| `--group` | Group entities into separate files by this key. Supports nested keys (e.g. `metadata.status`). | — |
| `--path` | Base directory for the dump output. | `./dump` |

### Identity resolution

If `users.json` and/or `workspaces.json` exist in the dump directory (from `dump users` / `dump workspaces`), entity ObjectIDs are automatically replaced:

- `user: "64f1c1e5..."` becomes `user: "john.doe"` (the user's username)
- `workspace: "64f1c1e5..."` becomes `workspace: "My Workspace"` (the workspace name)

This makes the dump files portable across environments. See [`restore blueprints`](/cli/restore) for how these are resolved back.

### Output structure

```
./dump/
├── users.json
├── workspaces.json
└── entities/
    └── <blueprint_name>/
        ├── page-1.json
        └── page-2.json
```

With `--group`:

```
./dump/entities/<blueprint_name>/
├── active.page-1.json
├── completed.page-1.json
└── completed.page-2.json
```

### Examples

```bash
# Dump all blueprints
qelos dump blueprints

# Dump specific blueprints
qelos dump blueprints user,order

# With a filter
qelos dump blueprints order --filter '{"metadata.status":"completed"}'

# Group by a field
qelos dump blueprints order --group "metadata.status"

# Custom output path
qelos dump blueprints all --path ./backup
```

---

## dump users

Downloads all users from the Qelos instance and saves them to `users.json`.

### Usage

```bash
qelos dump users [options]
```

### Options

| Option | Description | Default |
| --- | --- | --- |
| `--path` | Base directory for the dump output. | `./dump` |

### Output

Creates `<path>/users.json` containing an array of user objects:

```json
[
  {
    "_id": "64f1c1e5c3f2...",
    "username": "john.doe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user"],
    "metadata": {}
  }
]
```

### Example

```bash
qelos dump users
qelos dump users --path ./backup
```

---

## dump workspaces

Downloads all workspaces from the Qelos instance and saves them to `workspaces.json`.

### Usage

```bash
qelos dump workspaces [options]
```

### Options

| Option | Description | Default |
| --- | --- | --- |
| `--path` | Base directory for the dump output. | `./dump` |

### Output

Creates `<path>/workspaces.json` containing an array of workspace objects:

```json
[
  {
    "_id": "64f1c1e5c3f2...",
    "name": "My Workspace",
    "labels": ["production"],
    "logo": "https://..."
  }
]
```

### Example

```bash
qelos dump workspaces
qelos dump workspaces --path ./backup
```

---

## Related Commands

- [`qelos restore blueprints`](/cli/restore) — Restore dumped entities to a (different) Qelos environment
- [`qelos blueprints generate`](/cli/blueprints) — Generate blueprint definitions from a MongoDB database
- [`qelos pull`](/cli/pull) — Pull blueprint definitions, components, and other resource types
