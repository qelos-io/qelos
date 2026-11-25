# Express + Qelos mock (no tenant)

A minimal Express app that runs with only a local folder of `qelos pull` / `qelos dump` artifacts and
`@qelos/dev-mock`. It never contacts a Qelos tenant.

This folder is a standalone example: it is not part of the pnpm workspace and nothing in the monorepo depends on it.

```bash
npm install
npm start            # http://127.0.0.1:3000
npm run verify       # end-to-end check (signup, signin, logout, persona switch, entities, restart persistence)
```

`qelos-mock/` was created with `qelos mock init` plus a pulled `blueprints/todo.blueprint.json` and a dumped
`entities/todo/page-1.json`. Personas are in `qelos-mock/personas.json` (`admin@example.com` / `admin-pass`, ...).
The app persists to `qelos-mock/state/*.json` (git-ignored); delete those files to reset.

```bash
curl -c jar -X POST localhost:3000/api/signin -H 'content-type: application/json' \
  -d '{"username":"admin@example.com","password":"admin-pass"}'
curl -b jar localhost:3000/whoami
curl -b jar localhost:3000/api/blueprints/todo/entities
curl -b jar -H 'x-qelos-mock-persona: guest@example.com' localhost:3000/api/me
```

Note: `server.mjs` is started with plain `node`. When using the packages from this monorepo checkout instead of
npm, the local `@qelos/sdk` build needs a TypeScript-aware loader, e.g. `node --import tsx server.mjs`.
