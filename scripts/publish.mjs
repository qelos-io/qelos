#!/usr/bin/env node
// Reusable release script: install + test + build + login + publish
// for all public @qelos/* packages, integrators, the CLI, and the Python packages.
//
// Usage:
//   node scripts/publish.mjs                  full release flow
//   node scripts/publish.mjs --major          bump major across all packages, then release
//   node scripts/publish.mjs --minor          bump minor across all packages, then release
//   node scripts/publish.mjs --patch          bump patch across all packages, then release
//   node scripts/publish.mjs --set-version 5.0.0   set an explicit version, then release
//   node scripts/publish.mjs --dry-run        print actions, do not execute
//   node scripts/publish.mjs --skip-install   skip `pnpm install` and `pip install build twine`
//   node scripts/publish.mjs --skip-test      skip running tests
//   node scripts/publish.mjs --skip-build     skip running builds
//   node scripts/publish.mjs --skip-login     skip `pnpm login`
//   node scripts/publish.mjs --skip-publish   skip the actual publish step
//   node scripts/publish.mjs --skip-python    skip Python packages entirely
//   node scripts/publish.mjs --tag next       publish under an npm dist-tag (npm only)
//   node scripts/publish.mjs --only sdk,cli   publish only the listed package keys
//   node scripts/publish.mjs --python python3.12   override the python interpreter (default: python3)
//
// Notes:
// - pnpm rewrites `workspace:*` / `workspace:^` to the actual version on publish.
// - tools/cli is NOT in pnpm-workspace.yaml, so its install/build/test runs in-place.
// - Python publishing uses `python -m build` + `twine upload`. Configure PyPI credentials via
//   ~/.pypirc, TWINE_USERNAME/TWINE_PASSWORD env vars, or run twine interactively in a TTY.
//   `qelos-sdk` (PyPI) is published before `qelos-integrator-fastapi` so the dep resolves.
// - Version bumps always apply to ALL packages (to keep them aligned), even with --only.

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Order matters: dependencies first so the registry has them when downstream
// packages (or end users installing a downstream package) resolve their deps.
// Python packages live alongside npm ones; the SDK comes before the integrator.
const PACKAGES = [
  { key: 'global-types',          dir: 'packages/global-types',         kind: 'npm',    workspace: true  },
  { key: 'cache-manager',         dir: 'packages/cache-manager',        kind: 'npm',    workspace: true  },
  { key: 'web-sdk',               dir: 'packages/web-sdk',              kind: 'npm',    workspace: true  },
  { key: 'sdk',                   dir: 'packages/sdk',                  kind: 'npm',    workspace: true  },
  { key: 'api-kit',               dir: 'packages/api-kit',              kind: 'npm',    workspace: true  },
  { key: 'plugin-netlify-api',    dir: 'packages/plugin-netlify-api',   kind: 'npm',    workspace: true  },
  { key: 'plugin-play',           dir: 'packages/plugin-play',          kind: 'npm',    workspace: true  },
  { key: 'integrator-express',    dir: 'integrators/express',           kind: 'npm',    workspace: true  },
  { key: 'integrator-fastify',    dir: 'integrators/fastify',           kind: 'npm',    workspace: true  },
  { key: 'integrator-nest',       dir: 'integrators/nest',              kind: 'npm',    workspace: true  },
  { key: 'integrator-next',       dir: 'integrators/next',              kind: 'npm',    workspace: true  },
  { key: 'integrator-nuxt',       dir: 'integrators/nuxt',              kind: 'npm',    workspace: true  },
  { key: 'cli',                   dir: 'tools/cli',                     kind: 'npm',    workspace: false },
  { key: 'python-sdk',            dir: 'packages/python-sdk',           kind: 'python'                   },
  { key: 'integrator-fastapi',    dir: 'integrators/fastapi',           kind: 'python'                   },
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
const SKIP_PYTHON = flag('--skip-python');
const TAG = value('--tag');
const ONLY = value('--only')?.split(',').map((s) => s.trim()).filter(Boolean);
const PYTHON = value('--python') || 'python3';

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

let targets = ONLY ? PACKAGES.filter((p) => ONLY.includes(p.key)) : PACKAGES;
if (ONLY && targets.length !== ONLY.length) {
  const known = PACKAGES.map((p) => p.key).join(', ');
  console.error(`Unknown --only key. Known keys: ${known}`);
  process.exit(1);
}
if (SKIP_PYTHON) {
  targets = targets.filter((p) => p.kind !== 'python');
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

// ---------- Python helpers ----------
// Lightweight pyproject.toml reader/writer — we only need the `name`, the top-level
// `version`, and to rewrite `version` / internal `>=` deps. A full TOML parser would
// be overkill here.
function readPyproject(dir) {
  return readFileSync(join(ROOT, dir, 'pyproject.toml'), 'utf8');
}

function writePyproject(dir, text) {
  writeFileSync(join(ROOT, dir, 'pyproject.toml'), text);
}

function readPyMeta(dir) {
  const text = readPyproject(dir);
  const name = /^\s*name\s*=\s*"([^"]+)"/m.exec(text)?.[1];
  const version = /^\s*version\s*=\s*"([^"]+)"/m.exec(text)?.[1];
  if (!name || !version) throw new Error(`Cannot read name/version from ${dir}/pyproject.toml`);
  return { name, version };
}

function writePyVersion(dir, newVersion) {
  const text = readPyproject(dir).replace(
    /^(\s*version\s*=\s*)"[^"]+"/m,
    `$1"${newVersion}"`,
  );
  writePyproject(dir, text);
}

// Rewrites internal Python-package pins like `qelos-sdk>=X.Y.Z` to `>=<newVersion>`
// inside the package's pyproject.toml dependencies arrays.
function realignPyInternalDeps(dir, newVersion, internalNames) {
  let text = readPyproject(dir);
  let changed = false;
  for (const name of internalNames) {
    const re = new RegExp(`("${name.replace(/[-/]/g, '[-_]')}\\s*>=\\s*)\\d+(?:\\.\\d+)*(")`, 'g');
    const next = text.replace(re, `$1${newVersion}$2`);
    if (next !== text) {
      changed = true;
      text = next;
    }
  }
  if (changed) writePyproject(dir, text);
  return changed;
}

// Unified accessors over npm + python packages.
function pkgMeta(p) {
  if (p.kind === 'python') return readPyMeta(p.dir);
  const pkg = readPkg(p.dir);
  return { name: pkg.name, version: pkg.version };
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
  const internalNames = new Set(
    PACKAGES.filter((p) => p.kind === 'npm').map((p) => readPkg(p.dir).name),
  );
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

  const currentVersions = PACKAGES.map((p) => pkgMeta(p).version);
  const highest = currentVersions.reduce((acc, v) => (compareVersions(v, acc) > 0 ? v : acc), '0.0.0');
  const newVersion = SET_VERSION || bumpVersion(highest, BUMP_KIND);
  log.info(`Highest current version: ${highest} → new version: ${newVersion}`);

  const pyInternalNames = PACKAGES
    .filter((p) => p.kind === 'python')
    .map((p) => readPyMeta(p.dir).name);

  for (const p of PACKAGES) {
    if (p.kind === 'python') {
      const meta = readPyMeta(p.dir);
      const before = meta.version;
      const action = `${meta.name.padEnd(34)} ${before} → ${newVersion}`;
      if (DRY) {
        console.log(`  ${C.dim}(dry)${C.reset} ${action}`);
      } else {
        writePyVersion(p.dir, newVersion);
        const depsChanged = realignPyInternalDeps(p.dir, newVersion, pyInternalNames);
        console.log(`  ${action}${depsChanged ? ' (deps realigned)' : ''}`);
      }
      continue;
    }
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
  const meta = pkgMeta(p);
  versions.add(meta.version);
  const tag = p.kind === 'python' ? `${C.dim}[py]${C.reset} ` : '';
  console.log(`  ${tag}${meta.name.padEnd(34)} ${meta.version}  ${C.dim}(${p.dir})${C.reset}`);
}
if (versions.size > 1) {
  log.warn(`Packages are not all on the same version: ${[...versions].join(', ')}`);
} else {
  log.ok(`All on version ${[...versions][0]}`);
}

// ---------- 2. Install ----------
const npmTargets = targets.filter((p) => p.kind === 'npm');
const pyTargets = targets.filter((p) => p.kind === 'python');

if (!SKIP_INSTALL) {
  if (npmTargets.length) {
    log.step('Install workspace dependencies');
    run('pnpm install');
    // tools/cli is not in pnpm-workspace.yaml — install it in-place.
    if (npmTargets.some((p) => !p.workspace) && existsSync(join(ROOT, 'tools/cli/package.json'))) {
      log.step('Install tools/cli (outside workspace)');
      run('pnpm install', { cwd: join(ROOT, 'tools/cli') });
    }
  }
  if (pyTargets.length) {
    log.step('Install Python build tools (build, twine)');
    run(`${PYTHON} -m pip install --quiet --upgrade build twine`);
  }
} else {
  log.warn('Skipping install (--skip-install)');
}

// ---------- 3. Build ----------
if (!SKIP_BUILD) {
  log.step('Build packages');
  for (const p of targets) {
    const cwd = join(ROOT, p.dir);
    if (p.kind === 'python') {
      const meta = readPyMeta(p.dir);
      log.info(`  ${meta.name}: building wheel + sdist`);
      // Clean prior artifacts so old versions don't get uploaded by `twine upload dist/*`.
      run(`rm -rf dist build *.egg-info`, { cwd });
      run(`${PYTHON} -m build`, { cwd });
      run(`${PYTHON} -m twine check dist/*`, { cwd });
      continue;
    }
    const pkg = readPkg(p.dir);
    if (!hasScript(pkg, 'build')) {
      log.info(`  ${pkg.name}: no build script, skipping`);
      continue;
    }
    run('pnpm run build', { cwd });
  }
} else {
  log.warn('Skipping build (--skip-build)');
}

// ---------- 4. Test ----------
if (!SKIP_TEST) {
  log.step('Run tests');
  for (const p of targets) {
    const cwd = join(ROOT, p.dir);
    if (p.kind === 'python') {
      const meta = readPyMeta(p.dir);
      const pyproject = readPyproject(p.dir);
      const hasPytest = pyproject.includes('[tool.pytest.ini_options]') && existsSync(join(cwd, 'tests'));
      if (!hasPytest) {
        log.info(`  ${meta.name}: no pytest config, skipping`);
        continue;
      }
      run(`${PYTHON} -m pytest`, { cwd });
      continue;
    }
    const pkg = readPkg(p.dir);
    if (!hasScript(pkg, 'test')) {
      log.info(`  ${pkg.name}: no test script, skipping`);
      continue;
    }
    run('pnpm test', { cwd });
  }
} else {
  log.warn('Skipping test (--skip-test)');
}

// ---------- 5. Login ----------
if (!SKIP_LOGIN && !SKIP_PUBLISH && npmTargets.length) {
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
if (!SKIP_PUBLISH && pyTargets.length) {
  log.info('PyPI auth: ensure ~/.pypirc, TWINE_USERNAME/TWINE_PASSWORD, or a TTY for `twine` prompts.');
}

// ---------- 6. Publish ----------
if (!SKIP_PUBLISH) {
  if (npmTargets.length) {
    log.step('Publish packages to npm');
    const publishFlags = ['--access', 'public', '--no-git-checks'];
    if (TAG) publishFlags.push('--tag', TAG);
    for (const p of npmTargets) {
      const pkg = readPkg(p.dir);
      log.step(`Publishing ${pkg.name}@${pkg.version}`);
      run(`pnpm publish ${publishFlags.join(' ')}`, { cwd: join(ROOT, p.dir) });
      log.ok(`${pkg.name}@${pkg.version} published`);
    }
  }
  if (pyTargets.length) {
    log.step('Publish packages to PyPI');
    if (TAG) log.warn(`--tag ${TAG} is npm-only and is ignored for PyPI uploads`);
    for (const p of pyTargets) {
      const meta = readPyMeta(p.dir);
      log.step(`Publishing ${meta.name}@${meta.version}`);
      // Inherits parent stdio, so twine can prompt for the token if no env/pypirc is set.
      run(`${PYTHON} -m twine upload dist/*`, { cwd: join(ROOT, p.dir) });
      log.ok(`${meta.name}@${meta.version} published`);
    }
  }
} else {
  log.warn('Skipping publish (--skip-publish)');
}

log.step('Done.');
log.ok(`Released ${targets.length} package(s).`);
