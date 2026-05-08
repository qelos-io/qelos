# `e2e` — integrator integration tests

End-to-end suite that boots each integrator package (`@qelos/integrator-{express,fastify,nest,next,nuxt}`) against a real Qelos stack and asserts auth, workspace, and entity flows.

## Quick start

```bash
# 1. Start the stack
docker compose -f compose/docker-compose.yml up -d

# 2. Seed the default admin (test@test.com / admin)
pnpm populate-db

# 3. Run the suite
QELOS_INTEGRATOR_E2E_URL=http://localhost:9000 pnpm -F e2e test
```

Or let the CLI do all three steps (probe gateway, seed if missing, run suite):

```bash
node tools/cli/cli.mjs test integrators
```

## Required env vars

| Variable | Default | Notes |
|---|---|---|
| `QELOS_INTEGRATOR_E2E_URL` | _(unset → tests skip)_ | Gateway base URL. Falls back to `QELOS_E2E_URL`. |
| `QELOS_INTEGRATOR_E2E_USERNAME` | `test@test.com` | Seeded by `pnpm populate-db`. |
| `QELOS_INTEGRATOR_E2E_PASSWORD` | `admin` | Seeded by `pnpm populate-db`. |
| `QELOS_INTEGRATOR_E2E_WORKSPACE` | `e2e-test` | Slug used to look up / create the workspace. |
| `QELOS_INTEGRATOR_E2E_BLUEPRINT` | `integrator-e2e-items` | Blueprint exercised by SDK entity ops. |

When `QELOS_INTEGRATOR_E2E_URL` is unset every `*.test.ts` calls `t.skip()` rather than failing — keeps fork PRs (no secrets) green in CI.

## Running a single integrator

```bash
pnpm -F e2e exec node --test --import tsx integrators/express.test.ts
```

## CI

`.github/workflows/main.yml` runs the suite after the per-package unit tests, injecting `QELOS_E2E_URL` / `QELOS_E2E_USERNAME` / `QELOS_E2E_PASSWORD` from repo secrets. Set those secrets in GitHub repo settings to enable the suite on CI; otherwise the step short-circuits via the skip gate above.
