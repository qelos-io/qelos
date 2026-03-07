const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const dotenv = require('dotenv');

/**
 * Mirrors the logic from services/load-env.mjs for testability in CJS.
 * Any changes to the source must be reflected here.
 */
function getEnvFiles(envSuffix) {
  return [
    ...(envSuffix ? [`.env.${envSuffix}.local`, `.env.${envSuffix}`] : []),
    '.env.local',
    '.env'
  ];
}

function loadEnv({ envSuffix, cwd, verbose } = {}) {
  const dir = cwd || process.cwd();
  const envFiles = getEnvFiles(envSuffix);
  const loaded = [];

  for (const envFile of envFiles) {
    const envPath = path.join(dir, envFile);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, quiet: true });
      if (verbose) console.log(`Loaded env file: ${envFile}`);
      loaded.push(envFile);
    }
  }

  return loaded;
}

describe('load-env', () => {
  let testDir;
  let originalEnv;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'load-env-test-'));
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('getEnvFiles', () => {
    it('should return default files when no suffix provided', () => {
      const files = getEnvFiles();
      assert.deepStrictEqual(files, ['.env.local', '.env']);
    });

    it('should return default files when suffix is undefined', () => {
      const files = getEnvFiles(undefined);
      assert.deepStrictEqual(files, ['.env.local', '.env']);
    });

    it('should return default files when suffix is empty string', () => {
      const files = getEnvFiles('');
      assert.deepStrictEqual(files, ['.env.local', '.env']);
    });

    it('should prepend suffix-specific files when suffix provided', () => {
      const files = getEnvFiles('production');
      assert.deepStrictEqual(files, [
        '.env.production.local',
        '.env.production',
        '.env.local',
        '.env'
      ]);
    });

    it('should handle arbitrary suffix values', () => {
      const files = getEnvFiles('staging');
      assert.deepStrictEqual(files, [
        '.env.staging.local',
        '.env.staging',
        '.env.local',
        '.env'
      ]);
    });
  });

  describe('loadEnv', () => {
    it('should load .env file and set process.env vars', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_TEST_VAR=hello\n');

      const loaded = loadEnv({ cwd: testDir });

      assert.deepStrictEqual(loaded, ['.env']);
      assert.strictEqual(process.env.LOAD_ENV_TEST_VAR, 'hello');
    });

    it('should load .env.local file', () => {
      fs.writeFileSync(path.join(testDir, '.env.local'), 'LOAD_ENV_LOCAL_VAR=local_val\n');

      const loaded = loadEnv({ cwd: testDir });

      assert.deepStrictEqual(loaded, ['.env.local']);
      assert.strictEqual(process.env.LOAD_ENV_LOCAL_VAR, 'local_val');
    });

    it('should load suffix-specific env files when envSuffix provided', () => {
      fs.writeFileSync(path.join(testDir, '.env.production'), 'LOAD_ENV_PROD_VAR=prod_val\n');

      const loaded = loadEnv({ cwd: testDir, envSuffix: 'production' });

      assert.ok(loaded.includes('.env.production'));
      assert.strictEqual(process.env.LOAD_ENV_PROD_VAR, 'prod_val');
    });

    it('should load suffix.local file when it exists', () => {
      fs.writeFileSync(path.join(testDir, '.env.staging.local'), 'LOAD_ENV_STAGING_LOCAL=sl_val\n');

      const loaded = loadEnv({ cwd: testDir, envSuffix: 'staging' });

      assert.ok(loaded.includes('.env.staging.local'));
      assert.strictEqual(process.env.LOAD_ENV_STAGING_LOCAL, 'sl_val');
    });

    it('should load multiple files in priority order', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_MULTI=from_env\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'LOAD_ENV_MULTI=from_local\n');

      const loaded = loadEnv({ cwd: testDir });

      assert.deepStrictEqual(loaded, ['.env.local', '.env']);
      // .env.local is loaded first, dotenv does not override existing vars
      assert.strictEqual(process.env.LOAD_ENV_MULTI, 'from_local');
    });

    it('should not override already-set vars (dotenv default behavior)', () => {
      fs.writeFileSync(path.join(testDir, '.env.production'), 'LOAD_ENV_PRIORITY=prod\n');
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_PRIORITY=base\n');

      const loaded = loadEnv({ cwd: testDir, envSuffix: 'production' });

      assert.ok(loaded.includes('.env.production'));
      assert.ok(loaded.includes('.env'));
      // .env.production loaded first, .env should not override
      assert.strictEqual(process.env.LOAD_ENV_PRIORITY, 'prod');
    });

    it('should return empty array when no env files exist', () => {
      const loaded = loadEnv({ cwd: testDir });
      assert.deepStrictEqual(loaded, []);
    });

    it('should skip non-existent files without error', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_SKIP_TEST=yes\n');

      const loaded = loadEnv({ cwd: testDir });

      assert.deepStrictEqual(loaded, ['.env']);
      assert.strictEqual(process.env.LOAD_ENV_SKIP_TEST, 'yes');
    });

    it('should log loaded files when verbose is true', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_VERBOSE=1\n');
      const consoleSpy = mock.method(console, 'log', () => {});

      loadEnv({ cwd: testDir, verbose: true });

      assert.ok(consoleSpy.mock.calls.some(c => c.arguments[0] === 'Loaded env file: .env'));
      consoleSpy.mock.restore();
    });

    it('should not log when verbose is false', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_QUIET=1\n');
      const consoleSpy = mock.method(console, 'log', () => {});

      loadEnv({ cwd: testDir, verbose: false });

      assert.strictEqual(consoleSpy.mock.callCount(), 0);
      consoleSpy.mock.restore();
    });

    it('should not log when verbose is undefined', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_NOLOG=1\n');
      const consoleSpy = mock.method(console, 'log', () => {});

      loadEnv({ cwd: testDir });

      assert.strictEqual(consoleSpy.mock.callCount(), 0);
      consoleSpy.mock.restore();
    });

    it('should work with no options (defaults)', () => {
      assert.doesNotThrow(() => loadEnv());
    });

    it('should load all four files when all exist with suffix', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'A=1\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'B=2\n');
      fs.writeFileSync(path.join(testDir, '.env.test'), 'C=3\n');
      fs.writeFileSync(path.join(testDir, '.env.test.local'), 'D=4\n');

      const loaded = loadEnv({ cwd: testDir, envSuffix: 'test' });

      assert.deepStrictEqual(loaded, [
        '.env.test.local',
        '.env.test',
        '.env.local',
        '.env'
      ]);
    });

    it('should handle multiline env files', () => {
      fs.writeFileSync(
        path.join(testDir, '.env'),
        'LOAD_ENV_LINE1=first\nLOAD_ENV_LINE2=second\n'
      );

      loadEnv({ cwd: testDir });

      assert.strictEqual(process.env.LOAD_ENV_LINE1, 'first');
      assert.strictEqual(process.env.LOAD_ENV_LINE2, 'second');
    });

    it('should handle quoted values in env files', () => {
      fs.writeFileSync(
        path.join(testDir, '.env'),
        'LOAD_ENV_QUOTED="hello world"\n'
      );

      loadEnv({ cwd: testDir });

      assert.strictEqual(process.env.LOAD_ENV_QUOTED, 'hello world');
    });

    it('should handle env files with comments', () => {
      fs.writeFileSync(
        path.join(testDir, '.env'),
        '# This is a comment\nLOAD_ENV_COMMENT_TEST=value\n# Another comment\n'
      );

      loadEnv({ cwd: testDir });

      assert.strictEqual(process.env.LOAD_ENV_COMMENT_TEST, 'value');
    });
  });
});
