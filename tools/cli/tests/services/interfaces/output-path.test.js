const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

/**
 * Verifies the resolution chain for the `--out` option of `qelos interfaces build`:
 *   1. CLI --out flag wins
 *   2. qelos.config.json `interfaces.out` (or `build.interfaces.out`) is the next default
 *   3. Otherwise the built-in default `./types`
 *
 * This is the explicit "test file to check the best place" requested in the spec.
 */

const loadConfigUrl = pathToFileURL(
  path.join(__dirname, '..', '..', '..', 'services', 'config', 'load-config.mjs')
).href;
const middlewareUrl = pathToFileURL(
  path.join(__dirname, '..', '..', '..', 'services', 'config', 'config-middleware.mjs')
).href;

const DEFAULT_OUT = './types';
const DEFAULT_PATH = './blueprints';

function makeArgv(overrides = {}) {
  return {
    lang: overrides.lang,
    out: overrides.out,
    path: overrides.path,
    save: overrides.save,
    verbose: false,
  };
}

describe('interfaces build — output path resolution', () => {
  let testDir;
  let configMod;
  let middlewareMod;
  let interfacesMiddleware;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'interfaces-out-test-'));
    if (!configMod) {
      configMod = await import(loadConfigUrl);
      middlewareMod = await import(middlewareUrl);
    }
    configMod.resetConfig();

    interfacesMiddleware = middlewareMod.createConfigMiddleware({
      keys: ['lang', 'out', 'path'],
      getDefaults: () => configMod.getInterfacesConfig(),
      saveDefaults: (_argv, opts, options) => configMod.saveInterfacesConfig(opts, options),
      getSaveKey: () => true,
    });
  });

  afterEach(() => {
    configMod?.resetConfig();
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  /**
   * Mimics the resolution that happens after yargs' `default: './types'` plus
   * the config middleware. We only need to verify the *interaction*: defaults
   * fill undefined, explicit values win, and config supplies undefined entries.
   */
  function applyResolution(argv) {
    interfacesMiddleware(argv);
    if (argv.out === undefined) argv.out = DEFAULT_OUT;
    if (argv.path === undefined) argv.path = DEFAULT_PATH;
    return argv;
  }

  it('defaults to ./types when neither config nor --out is provided', () => {
    const argv = applyResolution(makeArgv());
    assert.strictEqual(argv.out, DEFAULT_OUT);
    assert.strictEqual(argv.path, DEFAULT_PATH);
  });

  it('uses the explicit --out value when provided', () => {
    const argv = applyResolution(makeArgv({ out: './custom-types' }));
    assert.strictEqual(argv.out, './custom-types');
  });

  it('uses qelos.config.json `interfaces.out` when --out is not provided', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ interfaces: { out: './generated', path: './bp' } })
    );
    configMod.loadConfig({ cwd: testDir });

    const argv = applyResolution(makeArgv());
    assert.strictEqual(argv.out, './generated');
    assert.strictEqual(argv.path, './bp');
  });

  it('also reads the value from `build.interfaces` for users that scope under build', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ build: { interfaces: { out: './b-out' } } })
    );
    configMod.loadConfig({ cwd: testDir });

    const argv = applyResolution(makeArgv());
    assert.strictEqual(argv.out, './b-out');
  });

  it('prefers `interfaces` over `build.interfaces` when both are present', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({
        interfaces: { out: './primary' },
        build: { interfaces: { out: './fallback' } },
      })
    );
    configMod.loadConfig({ cwd: testDir });

    const argv = applyResolution(makeArgv());
    assert.strictEqual(argv.out, './primary');
  });

  it('CLI --out wins over the config-file value', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ interfaces: { out: './from-config' } })
    );
    configMod.loadConfig({ cwd: testDir });

    const argv = applyResolution(makeArgv({ out: './from-cli' }));
    assert.strictEqual(argv.out, './from-cli');
  });

  it('persists --out via --save under the `interfaces` key', () => {
    const argv = makeArgv({ out: './persisted', lang: 'ts', save: true });
    // saveConfig in the middleware writes to process.cwd() — temporarily chdir
    const originalCwd = process.cwd();
    try {
      process.chdir(testDir);
      interfacesMiddleware(argv);
    } finally {
      process.chdir(originalCwd);
    }

    const written = JSON.parse(fs.readFileSync(path.join(testDir, 'qelos.config.json'), 'utf-8'));
    assert.deepStrictEqual(written.interfaces, { lang: 'ts', out: './persisted' });
  });
});
