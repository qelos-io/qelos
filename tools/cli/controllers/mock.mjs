import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { logger } from '../services/utils/logger.mjs';
import { scaffoldMockFolder, DEFAULT_MOCK_DIR } from '../services/mock/scaffold.mjs';

/** Locate the `@qelos/dev-mock` serve bin from the project or from the CLI install. */
export function resolveDevMockBin(cwd = process.cwd()) {
  const bases = [path.join(cwd, 'noop.js'), import.meta.url];
  for (const base of bases) {
    try {
      const pkgPath = createRequire(base).resolve('@qelos/dev-mock/package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.['qelos-dev-mock'];
      if (bin) {
        const file = path.join(path.dirname(pkgPath), bin);
        if (fs.existsSync(file)) return file;
      }
    } catch {
      // try the next location
    }
  }
  return null;
}

export async function mockInitController({ dir = DEFAULT_MOCK_DIR, pull, dump, force }) {
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) {
    logger.error(`Path exists but is not a directory: ${dir}`);
    process.exit(1);
  }

  // dump/pull first (they need a tenant) so the scaffold never clobbers fetched files
  if (dump) {
    const { default: dumpUsers } = await import('./dump-users.mjs');
    const { default: dumpWorkspaces } = await import('./dump-workspaces.mjs');
    const { default: dumpBlueprints } = await import('./dump-blueprints.mjs');
    fs.mkdirSync(dir, { recursive: true });
    await dumpUsers({ path: dir });
    await dumpWorkspaces({ path: dir });
    await dumpBlueprints({ blueprints: 'all', path: dir });
  }
  if (pull) {
    const { default: pullController } = await import('./pull.mjs');
    fs.mkdirSync(dir, { recursive: true });
    await pullController({ type: 'all', path: dir });
  }

  const { dir: root, created, skipped } = scaffoldMockFolder(dir, { force });
  created.forEach((f) => logger.success(`Created ${path.relative(process.cwd(), f) || f}`));
  skipped.forEach((f) => logger.info(`Kept existing ${path.relative(process.cwd(), f) || f} (use --force to overwrite)`));

  console.log('');
  logger.section('Next steps:');
  console.log(`  QELOS_MOCK=${dir} npm run dev      # integrators use the mock instead of a tenant`);
  console.log(`  qelos mock serve ${dir}            # or run it as a standalone server`);
  if (!pull && !dump) {
    console.log(`  qelos pull all ${dir}              # optional: import blueprints, configs, ... from a tenant`);
    console.log(`  qelos dump users --path ${dir}     # optional: import users, workspaces, entities`);
  }
  return root;
}

export async function mockServeController({ dir = DEFAULT_MOCK_DIR, port, host }) {
  const bin = resolveDevMockBin();
  if (!bin) {
    logger.error('@qelos/dev-mock is not installed. Run `npm i -D @qelos/dev-mock` in your project.');
    process.exit(1);
  }
  if (!fs.existsSync(dir)) {
    logger.error(`Mock folder not found: ${dir}. Create it with \`qelos mock init ${dir}\`.`);
    process.exit(1);
  }
  const args = [bin, 'serve', '--dir', dir];
  if (port !== undefined) args.push('--port', String(port));
  if (host) args.push('--host', host);
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
  await new Promise(() => child.on('exit', (code) => process.exit(code ?? 0)));
}
