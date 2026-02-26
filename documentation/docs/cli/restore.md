---
title: Restore Command
editLink: true
---
# Restore Command

The `restore` command reads entity JSON files from a local dump directory and creates or updates them in a Qelos instance. It is the counterpart of [`dump`](/cli/dump) and is designed for cross-environment migration.

## Key feature: identity resolution

When entity files contain **usernames** or **workspace names** instead of ObjectIDs (produced by `dump blueprints`), the restore command automatically resolves them:

1. **Looks up** the user by username in the target environment.
2. If not found and `users.json` exists in the dump directory, **creates the user** from the dump data.
3. Replaces the username with the new user's `_id`.
4. Same logic applies for workspace names using `workspaces.json`.

This means you can dump from production and restore to staging without manually mapping IDs.

---

## restore blueprints

### Usage

```bash
qelos restore blueprints [blueprints] [options]
```

### Arguments

| Argument | Description | Default |
| --- | --- | --- |
| `blueprints` | Blueprint identifiers to restore (comma-separated) or `all`. | `all` |

### Options

| Option | Description | Default |
| --- | --- | --- |
| `--include` | Only restore files whose name includes this value. Comma-separated for multiple patterns. | — |
| `--exclude` | Skip files whose name includes this value. Comma-separated for multiple patterns. | — |
| `--override` | JSON object that is deep-merged into every entity before restoring. | — |
| `--replace` | Replace local JSON files with API response data after each restore. | `false` |
| `--path` | Base directory where dump data is stored. | `./dump` |

### What the command does

1. **Authenticates** with the target Qelos instance.
2. **Initializes identity resolution** — fetches users/workspaces from the target env and loads local `users.json`/`workspaces.json`.
3. **Resolves blueprints** — if `all`, discovers blueprint names from subdirectories in `<path>/entities/`.
4. **Reads JSON files** from each blueprint directory, applying `--include`/`--exclude` filters.
5. **Resolves identities** — for each entity, replaces usernames/workspace names with ObjectIDs (creating missing users/workspaces as needed).
6. **Applies the override** (if provided) via recursive deep merge.
7. **Creates or updates** each entity.
8. **Replaces local files** (when `--replace` is set) with API response data.

### Examples

#### Full migration workflow

```bash
# On source environment
export QELOS_URL=https://prod.example.com
qelos dump users
qelos dump workspaces
qelos dump blueprints

# On target environment
export QELOS_URL=https://staging.example.com
qelos restore blueprints
```

#### Restore specific blueprints

```bash
qelos restore blueprints user,order
```

#### Restore with override

```bash
qelos restore blueprints order \
  --override '{"metadata":{"migrated":true}}'
```

#### Selective file restore

```bash
# Only page-1 files
qelos restore blueprints order --include page-1

# Skip certain groups
qelos restore blueprints order --exclude cancelled,draft
```

#### Restore and sync back server data

```bash
qelos restore blueprints order --replace
```

#### Custom dump path

```bash
qelos restore blueprints all --path ./backup
```

### Identity resolution in detail

Given an entity file with:
```json
{
  "user": "john.doe",
  "workspace": "My Workspace",
  "metadata": { "name": "Order A" }
}
```

The restore command will:
1. Look up `john.doe` by username in the target environment.
2. If not found, check `users.json` for a user with `username: "john.doe"` and create them.
3. Replace `"john.doe"` with the user's `_id` (e.g. `"67a2b3c4d5e6..."`).
4. Same for `"My Workspace"` → look up or create → replace with `_id`.
5. The entity sent to the API will have valid ObjectIDs for the target environment.

---

## Related Commands

- [`qelos dump`](/cli/dump) — Dump entities, users, and workspaces from a Qelos instance
- [`qelos blueprints generate`](/cli/blueprints) — Generate blueprint definitions from a MongoDB database
- [`qelos push`](/cli/push) — Push blueprint definitions, components, and other resource types
