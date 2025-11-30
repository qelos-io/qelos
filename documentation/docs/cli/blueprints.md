---
title: Generate Blueprints
editLink: true
---

# {{ $frontmatter.title }}

The `blueprints generate` command scans an existing MongoDB database and converts each collection into a Qelos blueprint definition (`*.blueprint.json`). This is useful when you want to bootstrap Qelos data models from an existing application or quickly experiment with real schemas.

> Currently this command supports **MongoDB** connection strings only (`mongodb://`).

## Usage

```bash
qelos blueprints generate [path] --uri <mongodb-uri>
```

### Arguments

| Argument | Description | Default |
| --- | --- | --- |
| `path` | Output directory for the generated blueprint files. | `./blueprints` |

### Options

| Option | Description | Default |
| --- | --- | --- |
| `--uri` | MongoDB connection URI (must include the database name). | `mongodb://localhost:27017/db` |

## What the command does

1. Connects to the provided MongoDB database.
2. Lists all collections except `system.*` collections.
3. Samples up to **50 documents** per collection (using `$sample` when available) to avoid full collection scans.
4. Infers property descriptors for each field:
   - Detects types (string, number, boolean, datetime, object, etc.)
   - Marks array fields as `multi`
   - Generates JSON schema for nested objects (best effort, depth-limited)
   - Skips metadata keys such as `_id`, `user`, `workspace`, and anything starting with `__`
5. Ensures blueprint identifiers and names are in singular form.
6. Writes `<identifier>.blueprint.json` files into the target directory.

Each generated file includes:
- `identifier`, `name`, `description`
- Default permissions (workspace scope)
- Property descriptors with inferred metadata
- Empty `relations`, `limitations`, and disabled dispatchers (create/update/delete)
- Matching **SDK guide** (`<identifier>.sdk.md`) with usage instructions (list, get, create, update, delete) built from the inferred blueprint

### SDK Guides output

By default, the command writes a Markdown file next to every blueprint. Each guide shows:

- Installation snippet for `@qelos/sdk`
- Sample initialization of `QelosAdministratorSDK`
- Generated TypeScript interface reflecting the inferred properties
- Example payload built from sampled data (or sensible defaults)
- CRUD examples using `sdk.blueprints.entitiesOf('<identifier>')`

If you want to skip the Markdown guides you can pass `--guides false`:

```bash
qelos blueprints generate ./blueprints \
  --uri mongodb://localhost:27017/legacy_app \
  --guides false
```

This keeps only the `.blueprint.json` files while avoiding the additional documentation.

## Examples

### Generate blueprints with defaults

```bash
# Inside your workspace directory
qelos blueprints generate
# => writes files to ./blueprints using mongodb://localhost:27017/db
```

### Specify a custom output folder and MongoDB URI

```bash
qelos blueprints generate ./exports/blueprints \
  --uri "mongodb://127.0.0.1:27017/legacy_app"
```

### Combine with pulled resources

```bash
# Pull existing blueprints (if any) for reference
qelos pull blueprints ./blueprints

# Generate additional blueprints from MongoDB
qelos blueprints generate ./blueprints --uri mongodb://localhost:27017/crm

# Review and push back to Qelos when ready
qelos push blueprints ./blueprints
```

## Notes & Limitations

- Only MongoDB URIs are supported at the moment.
- Make sure the database user has read access to the target collections.
- Fields that never appear in the sampled documents will not be included.
- Nested object schemas are inferred up to **3 levels** deep; deeper structures are represented as generic objects.
- Arrays are sampled to determine their item type, but mixed-type arrays fall back to `string`.
- Generated blueprints disable dispatchers by default—update them manually if you need create/update/delete events.
- Review permissions and descriptions before pushing to your Qelos instance.

## Related Commands

- [`qelos pull`](/cli/pull) – Retrieve existing blueprints from Qelos
- [`qelos push`](/cli/push) – Upload generated or edited blueprints back to Qelos
- [`qelos generate rules`](/cli/generate) – Produce IDE rules that explain your blueprint structure
