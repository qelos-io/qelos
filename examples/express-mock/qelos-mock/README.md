# Qelos mock folder

Local data for developing **without a Qelos tenant**. Point an integrator at this folder:

```bash
QELOS_MOCK=./qelos-mock npm run dev
# or run the mock as a standalone HTTP server
qelos mock serve qelos-mock
```

| Path | Purpose |
|---|---|
| `personas.json` | Users you can act as (roles, workspace labels/roles). Applied when the mock first starts. |
| `workspaces.json` | Workspaces (same format as `qelos dump workspaces`). |
| `blueprints/`, `configs/`, `components/`, `blocks/`, ... | Output of `qelos pull all qelos-mock` (optional). |
| `users.json`, `entities/` | Output of `qelos dump users\|blueprints --path qelos-mock` (optional). |
| `state/` | The mock's persisted state (JSON). Delete it to start over, or `POST /__qelos_mock__/reset`. |

Once `state/` exists it wins over the other files, so edits to the personas or artifacts are picked up
after deleting `state/`. `state/` is git-ignored (it contains hashed passwords and sessions).
