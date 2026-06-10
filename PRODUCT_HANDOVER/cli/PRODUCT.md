# CLI (@qelos/cli)

Developer CLI (`qelos` / `qplay`) for scaffolding apps, syncing Qelos resources, generating integrations, and local dev proxy.

## What Developers Can Do

- **Authenticate**: Login/logout against Qelos environments
- **Scaffold projects**: Create apps and write integrator config
- **Sync resources**: Pull/push components, blueprints, plugins, integrations
- **Migrate data**: Dump/restore blueprint entities and users
- **Generate code**: IDE rules, connections, agents, API proxies, TypeScript interfaces
- **Dev locally**: Proxy `/api/*` to Qelos while running local app
- **Chat with agents**: Interactive terminal agent sessions

## Command Groups

### Project & setup
| Command | Purpose |
|---------|---------|
| `qelos create [boilerplate] <name>` | Scaffold vue, vanilla, crud, ui-lib, or custom repo |
| `qelos init` | Detect framework, write `qelos.config` |
| `qelos global set\|delete\|info\|list` | Named global environments |

### Authentication
| Command | Purpose |
|---------|---------|
| `qelos auth login` | Store API token in `~/.qelos/credentials.json` |
| `qelos auth logout` | Clear credentials |
| `qelos auth token [--show]` | Show stored token |
| `qelos auth status` | Check auth state |

### Resource sync
| Command | Purpose |
|---------|---------|
| `qelos pull <type> <path>` | Pull from Qelos to local files |
| `qelos push <type> <path> [--hard]` | Push local files to Qelos |
| `qelos get <type> <path> [--json]` | Inspect local resources |

Types: `components`, `blueprints`, `configs`, `plugins`, `blocks`, `integrations`, `connections`, `all`, `committed`, `staged`

### Data migration
| Command | Purpose |
|---------|---------|
| `qelos dump blueprints [names]` | Export entity data |
| `qelos dump users\|workspaces` | Export users/workspaces |
| `qelos restore blueprints [names]` | Import with clone/override options |

### Codegen
| Command | Purpose |
|---------|---------|
| `qelos generate rules <cursor\|windsurf\|claude\|all>` | IDE assistant rules |
| `qelos generate connection <name>` | Integration source JSON |
| `qelos generate agent <name>` | AI agent integration JSON |
| `qelos generate proxy <from> <to>` | External API proxy plugin |
| `qelos blueprints generate` | Reverse-engineer from MongoDB |
| `qelos interfaces build` | TS/Python types from blueprint JSON |

### AI & dev
| Command | Purpose |
|---------|---------|
| `qelos agent <integrationId>` | Interactive/streaming agent chat |
| `qelos dev [--port] [--target]` | Local BFF dev proxy |
| `qelos test integrators` | E2E integrator tests against live stack |

## Related

- [SDK](../sdk/PRODUCT.md)
- [Integrators](../integrators/PRODUCT.md)
