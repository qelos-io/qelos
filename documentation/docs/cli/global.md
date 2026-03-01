---
title: Global Command
editLink: true
---

# Global Environments

The `qelos global` command lets you register a Qelos project directory as a named **global environment**. Once registered, you can run any agent (or dump/restore) command from **any folder on your machine** and have it automatically use the credentials and config from the registered project — no need to `cd` into it first.

## The problem it solves

Your Qelos credentials (`.env`) and per-command defaults (`qelos.config.json`) live inside a specific project directory. Without globals, you always have to be inside that directory to run the CLI.

With globals you can:
- Register your main project once: `qelos global set`
- Run agents or data commands from anywhere: `qelos agent my-agent --global`
- Maintain multiple named environments (dev, staging, production) and switch with a single flag

---

## Commands

### `qelos global set [name]`

Registers the **current working directory** as a named global environment.

```bash
qelos global set           # register cwd as "default"
qelos global set staging   # register cwd as "staging"
qelos global set prod      # register cwd as "prod"
```

The registry is stored at `~/.qelos-env/globals.json`.

---

### `qelos global list`

Lists all registered global environments.

```bash
qelos global list
```

Example output:
```
Global environments (~/.qelos-env):

  default: /Users/david/projects/my-qelos-app
  staging: /Users/david/projects/my-qelos-staging
  prod: /Users/david/projects/my-qelos-prod [NOT FOUND]
```

`[NOT FOUND]` means the registered path no longer exists on disk.

---

### `qelos global info [name]`

Shows detailed info about a single registered environment.

```bash
qelos global info           # info for "default"
qelos global info staging   # info for "staging"
```

Example output:
```
Global env: default
Path:       /Users/david/projects/my-qelos-app
Exists:     yes
Env files:  .env
```

---

### `qelos global delete [name]`

Removes a named global environment from the registry. The actual project directory is not touched.

```bash
qelos global delete           # remove "default"
qelos global delete staging   # remove "staging"
```

---

## Using a global environment: `--global` / `-g`

Once a directory is registered, pass `--global` to any supported command to use that environment's credentials and config instead of the current directory.

```bash
# Use the "default" global env (flag without a value)
qelos agent my-agent --global

# Use a named global env
qelos agent my-agent --global staging
qelos agent my-agent -g prod

# Works with dump and restore too
qelos dump blueprints --global
qelos restore blueprints --global prod
```

### What gets loaded from the global directory

| Source | Effect |
|--------|--------|
| `.env` / `.env.local` | API credentials and environment variables |
| `qelos.config.json` | Per-command defaults (agents, dump, restore paths, etc.) |
| `integrations/` folder | Integration name lookup for `qelos agent <name>` |

CLI flags always take precedence over both config defaults and the `--global` env.

---

## Registry file

The registry lives at `~/.qelos-env/globals.json` (on Windows: `%USERPROFILE%\.qelos-env\globals.json`).

```json
{
  "default": "/Users/david/projects/my-qelos-app",
  "staging": "/Users/david/projects/my-qelos-staging",
  "prod":    "/Users/david/projects/my-qelos-prod"
}
```

You can edit this file manually if needed.

---

## End-to-end example

```bash
# Step 1: go to your main project and register it
cd ~/projects/my-qelos-app
qelos global set
# → Global env "default" set to: /Users/david/projects/my-qelos-app

# Step 2: register a staging project under a different name
cd ~/projects/my-qelos-staging
qelos global set staging
# → Global env "staging" set to: /Users/david/projects/my-qelos-staging

# Step 3: verify the registry
qelos global list
# → default: /Users/david/projects/my-qelos-app
# → staging: /Users/david/projects/my-qelos-staging

# Step 4: from ANY directory, run an agent using the default global
cd /tmp
qelos agent code-wizard --global -m "Hello from /tmp!"
# Loads .env from /Users/david/projects/my-qelos-app
# Resolves integration name from its integrations/ folder

# Step 5: use the staging environment
qelos agent code-wizard --global staging -m "Test on staging"

# Step 6: dump blueprints using the staging env's config & credentials
qelos dump blueprints --global staging

# Step 7: clean up when staging is gone
qelos global delete staging
```

---

## Tips

- **Team workflows**: each team member registers their own local clone; `--global` keeps per-user paths private and out of version control.
- **Multiple instances**: register `dev`, `staging`, and `prod` and switch with just `-g prod`.
- **CI/CD**: in a pipeline, you already have the project checked out, so `--global` is not needed there. Use it for local developer convenience.
- **Check your registered envs**: run `qelos global info` before a session to confirm the path and env files are in order.

---

## Related

- [CLI Introduction](/cli/) — Global options including `--global`
- [Agent Command](/cli/agent) — Run agents from a global environment
- [Dump Command](/cli/dump) — Dump blueprint data using a global env's credentials
- [Restore Command](/cli/restore) — Restore data using a global env's credentials
