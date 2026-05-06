# Integrators

This folder hosts **integrator packages** — npm packages that ship Qelos integrations
for **external** runtimes and frameworks (e.g. Nuxt, Next.js, Netlify).

## Convention

`integrators/*` is a sibling of `packages/*` in the pnpm workspace. The two folders
exist because they have different audiences:

| Folder           | Audience                             | Consumed by apps in this monorepo? | Published to npm?      |
| ---------------- | ------------------------------------ | ---------------------------------- | ---------------------- |
| `packages/*`     | Apps in this monorepo + external     | Yes                                | Some are               |
| `integrators/*`  | **External** apps only               | **No**                             | Yes                    |
|

Putting integrators in their own folder keeps the boundary explicit:

- Apps in `apps/*` MUST NOT depend on anything under `integrators/*`. If you find
  yourself wanting to, the code probably belongs in `packages/*` instead.
- Integrators MAY depend on packages from `packages/*` (e.g. `@qelos/sdk`).
- Each integrator is independently versioned and published.

## Adding a new integrator

1. Create `integrators/<name>/` with a `package.json` (scoped under `@qelos/`).
2. The package is automatically picked up by the pnpm workspace via
   `pnpm-workspace.yaml` (`integrators/*`).
3. Add a `build` script — CI runs `pnpm --filter "./integrators/**" build` after
   building `packages/*` and before building `apps/*` (see
   `.github/workflows/main.yml`).
4. Configure `publishConfig.access: public` if the package is scoped and intended
   for the public npm registry.
