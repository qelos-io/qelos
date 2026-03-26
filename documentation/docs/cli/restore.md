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
| `--clone` | Clone mode: restore all data to a new environment, resolving blueprint relations recursively and remapping all IDs. | `false` |

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

---

### Clone mode (`--clone`)

The `--clone` flag enables full environment cloning. Unlike the default restore (which updates existing entities by ID), clone mode **creates new entities** in the target environment and automatically remaps all cross-blueprint relations so references stay consistent.

#### Prerequisites

Clone mode requires both `users.json` and `workspaces.json` in the dump directory. Run these against the **source** environment first:

```bash
qelos dump users
qelos dump workspaces
qelos dump blueprints
```

#### How it works

1. **Validates** that `users.json` and `workspaces.json` exist in the dump directory.
2. **Fetches blueprint definitions** from the target environment to discover relations between blueprints.
3. **Topologically sorts** blueprints by their relation dependencies (using Kahn's algorithm), so that referenced blueprints are restored before the blueprints that reference them.
4. **Creates new entities** for each blueprint in dependency order:
   - Strips `_id` and `identifier` from dumped entities so the target environment assigns fresh IDs.
   - Resolves user/workspace references via identity resolution (same as default mode).
   - Applies `--override` if provided.
   - **Remaps relation fields** — replaces old-environment ObjectIDs with the newly created IDs using a running ID map.
5. **Tracks all ID mappings** (old → new) across blueprints so downstream relations resolve correctly.

If circular dependencies are detected, the affected blueprints are restored last with a warning (some relations may not resolve).

#### Examples

##### Clone entire environment

```bash
# Dump everything from source
export QELOS_URL=https://source.example.com
qelos dump users
qelos dump workspaces
qelos dump blueprints

# Clone to a fresh target
export QELOS_URL=https://target.example.com
qelos restore blueprints --clone
```

##### Clone specific blueprints with filtering

```bash
qelos restore blueprints order,product --clone --exclude draft
```

---

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
