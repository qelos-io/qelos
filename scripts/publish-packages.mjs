#!/usr/bin/env node
// Publish each @qelos package under packages/ and integrators/ to npm, one at a time.
//
// Usage:
//   node scripts/publish-packages.mjs                 publish all (dependency order)
//   node scripts/publish-packages.mjs --list          show packages and versions
//   node scripts/publish-packages.mjs sdk             publish one package by key
//   node scripts/publish-packages.mjs --only sdk,cli  publish selected keys
//   node scripts/publish-packages.mjs --dry-run       print commands only
//   node scripts/publish-packages.mjs --otp 123456    pass npm 2FA OTP
//   node scripts/publish-packages.mjs --tag next      publish under a dist-tag
//   node scripts/publish-packages.mjs --skip-login    skip `pnpm whoami` / `pnpm login`
//
// Notes:
// - Does not publish apps/, tools/, or Python packages.
// - pnpm rewrites workspace:* / workspace:^ deps to the published version.
// - Run build/test first, or use `node scripts/publish.mjs` for the full release flow.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Dependency order: publish upstream packages before dependents.
const PACKAGES = [
  { key: 'global-types',       dir: 'packages/global-types' },
  { key: 'cache-manager',      dir: 'packages/cache-manager' },
  { key: 'web-sdk',            dir: 'packages/web-sdk' },
  { key: 'sdk',                dir: 'packages/sdk' },
  { key: 'api-kit',            dir: 'packages/api-kit' },
  { key: 'plugin-netlify-api', dir: 'packages/plugin-netlify-api' },
  { key: 'plugin-play',        dir: 'packages/plugin-play' },
  { key: 'integrator-express', dir: 'integrators/express' },
  { key: 'integrator-fastify', dir: 'integrators/fastify' },
  { key: 'integrator-nest',    dir: 'integrators/nest' },
  { key: 'integrator-next',    dir: 'integrators/next' },
  { key: 'integrator-nuxt',    dir: 'integrators/nuxt' },
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};

const DRY = flag('--dry-run');
const LIST = flag('--list');
const SKIP_LOGIN = flag('--skip-login');
const TAG = value('--tag');
const OTP = value('--otp');
const ONLY = value('--only')?.split(',').map((s) => s.trim()).filter(Boolean);
const POSITIONAL = args.filter((a) => !a.startsWith('--'));

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m',
};
const log = {
  step: (m) => console.log(`\n${C.bold}${C.cyan}▶ ${m}${C.reset}`),
  info: (m) => console.log(`${C.dim}${m}${C.reset}`),
  ok: (m) => console.log(`${C.green}✓ ${m}${C.reset}`),
  warn: (m) => console.log(`${C.yellow}! ${m}${C.reset}`),
  err: (m) => console.error(`${C.red}✗ ${m}${C.reset}`),
};

function readPkg(dir) {
  return JSON.parse(readFileSync(join(ROOT, dir, 'package.json'), 'utf8'));
}

function run(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  console.log(`${C.dim}$ (${cwd.replace(ROOT, '.') || '.'}) ${cmd}${C.reset}`);
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

const keys = ONLY ?? POSITIONAL;
let targets = keys.length ? PACKAGES.filter((p) => keys.includes(p.key)) : PACKAGES;

if (keys.length && targets.length !== keys.length) {
  const unknown = keys.filter((k) => !PACKAGES.some((p) => p.key === k));
  const known = PACKAGES.map((p) => p.key).join(', ');
  log.err(`Unknown package key(s): ${unknown.join(', ')}. Known keys: ${known}`);
  process.exit(1);
}

if (LIST) {
  log.step('Publishable packages (packages/ + integrators/)');
  for (const p of PACKAGES) {
    const pkg = readPkg(p.dir);
    console.log(`  ${p.key.padEnd(22)} ${pkg.name.padEnd(34)} ${pkg.version}`);
  }
  process.exit(0);
}

if (!targets.length) {
  log.err('No packages selected.');
  process.exit(1);
}

log.step(`Packages to publish (${targets.length})`);
for (const p of targets) {
  const pkg = readPkg(p.dir);
  console.log(`  ${pkg.name}@${pkg.version}  ${C.dim}(${p.dir})${C.reset}`);
}

if (!SKIP_LOGIN && !DRY) {
  log.step('Verify npm registry login');
  const who = tryRun('pnpm whoami', { stdio: ['inherit', 'pipe', 'pipe'] });
  if (who.status === 0 && who.stdout) {
    log.ok(`Logged in as ${who.stdout.toString().trim()}`);
  } else {
    log.warn('Not logged in — run `pnpm login` in an interactive terminal, then retry.');
    process.exit(1);
  }
}

const publishFlags = ['--access', 'public', '--no-git-checks'];
if (TAG) publishFlags.push('--tag', TAG);
if (OTP) publishFlags.push('--otp', OTP);

log.step('Publish to npm (one package at a time)');
for (const p of targets) {
  const pkg = readPkg(p.dir);
  const cwd = join(ROOT, p.dir);
  log.step(`${pkg.name}@${pkg.version}`);
  run(`pnpm publish ${publishFlags.join(' ')}`, { cwd });
  log.ok(`${pkg.name}@${pkg.version} published`);
}

log.step('Done.');
log.ok(`Published ${targets.length} package(s).`);
