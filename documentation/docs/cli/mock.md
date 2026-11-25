---
title: Mock Command
editLink: true
---
# Mock Command

Develop without a Qelos tenant. See the full guide: [Develop locally without a Qelos tenant](../testing/local-development.md).

## `qelos mock init [dir]`

Scaffolds a mock folder (default `./qelos-mock`): `personas.json` (admin, member, guest), `workspaces.json`, an empty `state/`, a `.gitignore` and a README.

| Option | Description |
|---|---|
| `--pull` | Also run `qelos pull all <dir>` (needs a tenant). |
| `--dump` | Also dump users, workspaces and blueprint entities into `<dir>` (needs a tenant). |
| `--force` | Overwrite existing scaffold files. |

## `qelos mock serve [dir]`

Runs the `@qelos/testing` server for the folder (install it with `npm i -D @qelos/testing`).

| Option | Description |
|---|---|
| `--port`, `-p` | Port (default: a free port). |
| `--host` | Host to bind (default `127.0.0.1`). |

```bash
qelos mock init
QELOS_MOCK=./qelos-mock npm run dev
```
