#!/usr/bin/env node
// Reusable release script: install + test + build + login + publish
// for all public @qelos/* packages, integrators, and the CLI.
//
// Usage:
//   node scripts/publish.mjs                  full release flow
//   node scripts/publish.mjs --major          bump major across all packages, then release
//   node scripts/publish.mjs --minor          bump minor across all packages, then release
//   node scripts/publish.mjs --patch          bump patch across all packages, then release
//   node scripts/publish.mjs --set-version 5.0.0   set an explicit version, then release
//   node scripts/publish.mjs --dry-run        print actions, do not execute
//   node scripts/publish.mjs --skip-install   skip `pnpm install`
//   node scripts/publish.mjs --skip-test      skip running tests
//   node scripts/publish.mjs --skip-build     skip running builds
//   node scripts/publish.mjs --skip-login     skip `pnpm login`
//   node scripts/publish.mjs --skip-publish   skip the actual publish step
//   node scripts/publish.mjs --tag next       publish under an npm dist-tag
//   node scripts/publish.mjs --only sdk,cli   publish only the listed package keys
//
// Notes:
// - pnpm rewrites `workspace:*` / `workspace:^` to the actual version on publish.
// - tools/cli is NOT in pnpm-workspace.yaml, so its install/build/test runs in-place.
// - Version bumps always apply to ALL packages (to keep them aligned), even with --only.

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Order matters: dependencies first so the registry has them when downstream
// packages (or end users installing a downstream package) resolve their deps.
const PACKAGES = [
  { key: 'global-types',          dir: 'packages/global-types',         workspace: true  },
  { key: 'cache-manager',         dir: 'packages/cache-manager',        workspace: true  },
  { key: 'web-sdk',               dir: 'packages/web-sdk',              workspace: true  },
  { key: 'sdk',                   dir: 'packages/sdk',                  workspace: true  },
  { key: 'api-kit',               dir: 'packages/api-kit',              workspace: true  },
  { key: 'plugin-netlify-api',    dir: 'packages/plugin-netlify-api',   workspace: true  },
  { key: 'plugin-play',           dir: 'packages/plugin-play',          workspace: true  },
  { key: 'integrator-express',    dir: 'integrators/express',           workspace: true  },
  { key: 'integrator-fastify',    dir: 'integrators/fastify',           workspace: true  },
  { key: 'integrator-nest',       dir: 'integrators/nest',              workspace: true  },
  { key: 'integrator-next',       dir: 'integrators/next',              workspace: true  },
  { key: 'integrator-nuxt',       dir: 'integrators/nuxt',              workspace: true  },
  { key: 'cli',                   dir: 'tools/cli',                     workspace: false },
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

const DRY = flag('--dry-run');
const SKIP_INSTALL = flag('--skip-install');
const SKIP_TEST = flag('--skip-test');
const SKIP_BUILD = flag('--skip-build');
const SKIP_LOGIN = flag('--skip-login');
const SKIP_PUBLISH = flag('--skip-publish');
const TAG = value('--tag');
const ONLY = value('--only')?.split(',').map((s) => s.trim()).filter(Boolean);

const BUMP = ['--major', '--minor', '--patch'].filter((f) => flag(f));
const SET_VERSION = value('--set-version');
if (BUMP.length > 1) {
  console.error('Pass at most one of --major / --minor / --patch.');
  process.exit(1);
}
if (BUMP.length && SET_VERSION) {
  console.error('Pass either --major/--minor/--patch OR --set-version, not both.');
  process.exit(1);
}
const BUMP_KIND = BUMP[0]?.replace('--', ''); // 'major' | 'minor' | 'patch' | undefined

const targets = ONLY ? PACKAGES.filter((p) => ONLY.includes(p.key)) : PACKAGES;
if (ONLY && targets.length !== ONLY.length) {
  const known = PACKAGES.map((p) => p.key).join(', ');
  console.error(`Unknown --only key. Known keys: ${known}`);
  process.exit(1);
}

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m',
};
const log = {
  step: (m)  => console.log(`\n${C.bold}${C.cyan}▶ ${m}${C.reset}`),
  info: (m)  => console.log(`${C.dim}${m}${C.reset}`),
  ok:   (m)  => console.log(`${C.green}✓ ${m}${C.reset}`),
  warn: (m)  => console.log(`${C.yellow}! ${m}${C.reset}`),
  err:  (m)  => console.error(`${C.red}✗ ${m}${C.reset}`),
};

function run(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  const display = `${C.dim}$ (${cwd.replace(ROOT, '.') || '.'}) ${cmd}${C.reset}`;
  console.log(display);
  if (DRY) return { status: 0 };
  const res = spawnSync(cmd, { cwd, stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    log.err(`Command failed (${res.status}): ${cmd}`);
    process.exit(res.status || 1);
  }
  return res;
}

function tryRun(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  if (DRY) {
    console.log(`${C.dim}$ (dry) ${cmd}${C.reset}`);
    return { status: 0 };
  }
  return spawnSync(cmd, { cwd, stdio: opts.stdio || 'inherit', shell: true });
}

function readPkg(dir) {
  return JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'));
}

function writePkg(dir, pkg) {
  writeFileSync(join(ROOT, dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

function hasScript(pkg, name) {
  return Boolean(pkg.scripts && pkg.scripts[name]);
}

function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v || '');
  if (!m) throw new Error(`Cannot parse version: ${v}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function compareVersions(a, b) {
  const av = parseVersion(a), bv = parseVersion(b);
  for (let i = 0; i < 3; i++) if (av[i] !== bv[i]) return av[i] - bv[i];
  return 0;
}

function bumpVersion(v, kind) {
  const [maj, min, pat] = parseVersion(v);
  if (kind === 'major') return `${maj + 1}.0.0`;
  if (kind === 'minor') return `${maj}.${min + 1}.0`;
  if (kind === 'patch') return `${maj}.${min}.${pat + 1}`;
  throw new Error(`Unknown bump kind: ${kind}`);
}

// Rewrites any non-workspace `@qelos/*` dep pin in deps/devDeps/peerDeps to `^<newVersion>`.
// Workspace pins (workspace:*, workspace:^) are left alone — pnpm rewrites them at publish time.
function realignInternalDeps(pkg, newVersion) {
  const fields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  let changed = false;
  const internalNames = new Set(PACKAGES.map((p) => readPkg(p.dir).name));
  for (const field of fields) {
    const deps = pkg[field];
    if (!deps) continue;
    for (const name of Object.keys(deps)) {
      if (!internalNames.has(name)) continue;
      const cur = deps[name];
      if (typeof cur === 'string' && cur.startsWith('workspace:')) continue;
      const next = `^${newVersion}`;
      if (cur !== next) {
        deps[name] = next;
        changed = true;
      }
    }
  }
  return changed;
}

// ---------- 0. Bump versions (optional) ----------
if (BUMP_KIND || SET_VERSION) {
  log.step(SET_VERSION ? `Set version to ${SET_VERSION}` : `Bump ${BUMP_KIND} across all packages`);

  const currentVersions = PACKAGES.map((p) => readPkg(p.dir).version);
  const highest = currentVersions.reduce((acc, v) => (compareVersions(v, acc) > 0 ? v : acc), '0.0.0');
  const newVersion = SET_VERSION || bumpVersion(highest, BUMP_KIND);
  log.info(`Highest current version: ${highest} → new version: ${newVersion}`);

  for (const p of PACKAGES) {
    const pkg = readPkg(p.dir);
    const before = pkg.version;
    pkg.version = newVersion;
    const depsChanged = realignInternalDeps(pkg, newVersion);
    const action = `${pkg.name.padEnd(34)} ${before} → ${newVersion}${depsChanged ? ' (deps realigned)' : ''}`;
    if (DRY) {
      console.log(`  ${C.dim}(dry)${C.reset} ${action}`);
    } else {
      writePkg(p.dir, pkg);
      console.log(`  ${action}`);
    }
  }
  log.ok(`Versions ${DRY ? 'would be' : ''} set to ${newVersion}`);
}

// ---------- 1. Pre-flight ----------
log.step('Pre-flight: verify versions are aligned');
const versions = new Set();
for (const p of PACKAGES) {
  const pkg = readPkg(p.dir);
  versions.add(pkg.version);
  console.log(`  ${pkg.name.padEnd(34)} ${pkg.version}  ${C.dim}(${p.dir})${C.reset}`);
}
if (versions.size > 1) {
  log.warn(`Packages are not all on the same version: ${[...versions].join(', ')}`);
} else {
  log.ok(`All on version ${[...versions][0]}`);
}

// ---------- 2. Install ----------
if (!SKIP_INSTALL) {
  log.step('Install workspace dependencies');
  run('pnpm install');
  // tools/cli is not in pnpm-workspace.yaml — install it in-place.
  if (targets.some((p) => !p.workspace) && existsSync(join(ROOT, 'tools/cli/package.json'))) {
    log.step('Install tools/cli (outside workspace)');
    run('pnpm install', { cwd: join(ROOT, 'tools/cli') });
  }
} else {
  log.warn('Skipping install (--skip-install)');
}

// ---------- 3. Build ----------
if (!SKIP_BUILD) {
  log.step('Build packages');
  for (const p of targets) {
    const pkg = readPkg(p.dir);
    if (!hasScript(pkg, 'build')) {
      log.info(`  ${pkg.name}: no build script, skipping`);
      continue;
    }
    run('pnpm run build', { cwd: join(ROOT, p.dir) });
  }
} else {
  log.warn('Skipping build (--skip-build)');
}

// ---------- 4. Test ----------
if (!SKIP_TEST) {
  log.step('Run tests');
  for (const p of targets) {
    const pkg = readPkg(p.dir);
    if (!hasScript(pkg, 'test')) {
      log.info(`  ${pkg.name}: no test script, skipping`);
      continue;
    }
    run('pnpm test', { cwd: join(ROOT, p.dir) });
  }
} else {
  log.warn('Skipping test (--skip-test)');
}

// ---------- 5. Login ----------
if (!SKIP_LOGIN && !SKIP_PUBLISH) {
  log.step('Verify npm registry login');
  const who = tryRun('pnpm whoami', { stdio: ['inherit', 'pipe', 'pipe'] });
  if (who.status === 0 && who.stdout) {
    const user = who.stdout.toString().trim();
    log.ok(`Logged in as ${user}`);
  } else {
    log.warn('Not logged in — running `pnpm login` (interactive)');
    run('pnpm login');
  }
}

// ---------- 6. Publish ----------
if (!SKIP_PUBLISH) {
  log.step('Publish packages to npm');
  const publishFlags = ['--access', 'public', '--no-git-checks'];
  if (TAG) publishFlags.push('--tag', TAG);
  for (const p of targets) {
    const pkg = readPkg(p.dir);
    log.step(`Publishing ${pkg.name}@${pkg.version}`);
    run(`pnpm publish ${publishFlags.join(' ')}`, { cwd: join(ROOT, p.dir) });
    log.ok(`${pkg.name}@${pkg.version} published`);
  }
} else {
  log.warn('Skipping publish (--skip-publish)');
}

log.step('Done.');
log.ok(`Released ${targets.length} package(s).`);
