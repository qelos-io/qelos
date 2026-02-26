const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const dotenv = require('dotenv');

/**
 * Mirrors the logic from services/load-env.mjs for testability in CJS Jest.
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
      expect(files).toEqual(['.env.local', '.env']);
    });

    it('should return default files when suffix is undefined', () => {
      const files = getEnvFiles(undefined);
      expect(files).toEqual(['.env.local', '.env']);
    });

    it('should return default files when suffix is empty string', () => {
      const files = getEnvFiles('');
      expect(files).toEqual(['.env.local', '.env']);
    });

    it('should prepend suffix-specific files when suffix provided', () => {
      const files = getEnvFiles('production');
      expect(files).toEqual([
        '.env.production.local',
        '.env.production',
        '.env.local',
        '.env'
      ]);
    });

    it('should handle arbitrary suffix values', () => {
      const files = getEnvFiles('staging');
      expect(files).toEqual([
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

      expect(loaded).toEqual(['.env']);
      expect(process.env.LOAD_ENV_TEST_VAR).toBe('hello');
    });

    it('should load .env.local file', () => {
      fs.writeFileSync(path.join(testDir, '.env.local'), 'LOAD_ENV_LOCAL_VAR=local_val\n');

      const loaded = loadEnv({ cwd: testDir });

      expect(loaded).toEqual(['.env.local']);
      expect(process.env.LOAD_ENV_LOCAL_VAR).toBe('local_val');
    });

    it('should load suffix-specific env files when envSuffix provided', () => {
      fs.writeFileSync(path.join(testDir, '.env.production'), 'LOAD_ENV_PROD_VAR=prod_val\n');

      const loaded = loadEnv({ cwd: testDir, envSuffix: 'production' });

      expect(loaded).toContain('.env.production');
      expect(process.env.LOAD_ENV_PROD_VAR).toBe('prod_val');
    });

    it('should load suffix.local file when it exists', () => {
      fs.writeFileSync(path.join(testDir, '.env.staging.local'), 'LOAD_ENV_STAGING_LOCAL=sl_val\n');

      const loaded = loadEnv({ cwd: testDir, envSuffix: 'staging' });

      expect(loaded).toContain('.env.staging.local');
      expect(process.env.LOAD_ENV_STAGING_LOCAL).toBe('sl_val');
    });

    it('should load multiple files in priority order', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_MULTI=from_env\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'LOAD_ENV_MULTI=from_local\n');

      const loaded = loadEnv({ cwd: testDir });

      expect(loaded).toEqual(['.env.local', '.env']);
      // .env.local is loaded first, dotenv does not override existing vars
      expect(process.env.LOAD_ENV_MULTI).toBe('from_local');
    });

    it('should not override already-set vars (dotenv default behavior)', () => {
      fs.writeFileSync(path.join(testDir, '.env.production'), 'LOAD_ENV_PRIORITY=prod\n');
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_PRIORITY=base\n');

      const loaded = loadEnv({ cwd: testDir, envSuffix: 'production' });

      expect(loaded).toContain('.env.production');
      expect(loaded).toContain('.env');
      // .env.production loaded first, .env should not override
      expect(process.env.LOAD_ENV_PRIORITY).toBe('prod');
    });

    it('should return empty array when no env files exist', () => {
      const loaded = loadEnv({ cwd: testDir });
      expect(loaded).toEqual([]);
    });

    it('should skip non-existent files without error', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_SKIP_TEST=yes\n');

      const loaded = loadEnv({ cwd: testDir });

      expect(loaded).toEqual(['.env']);
      expect(process.env.LOAD_ENV_SKIP_TEST).toBe('yes');
    });

    it('should log loaded files when verbose is true', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_VERBOSE=1\n');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      loadEnv({ cwd: testDir, verbose: true });

      expect(consoleSpy).toHaveBeenCalledWith('Loaded env file: .env');
      consoleSpy.mockRestore();
    });

    it('should not log when verbose is false', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_QUIET=1\n');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      loadEnv({ cwd: testDir, verbose: false });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log when verbose is undefined', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'LOAD_ENV_NOLOG=1\n');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      loadEnv({ cwd: testDir });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should work with no options (defaults)', () => {
      expect(() => loadEnv()).not.toThrow();
    });

    it('should load all four files when all exist with suffix', () => {
      fs.writeFileSync(path.join(testDir, '.env'), 'A=1\n');
      fs.writeFileSync(path.join(testDir, '.env.local'), 'B=2\n');
      fs.writeFileSync(path.join(testDir, '.env.test'), 'C=3\n');
      fs.writeFileSync(path.join(testDir, '.env.test.local'), 'D=4\n');

      const loaded = loadEnv({ cwd: testDir, envSuffix: 'test' });

      expect(loaded).toEqual([
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

      expect(process.env.LOAD_ENV_LINE1).toBe('first');
      expect(process.env.LOAD_ENV_LINE2).toBe('second');
    });

    it('should handle quoted values in env files', () => {
      fs.writeFileSync(
        path.join(testDir, '.env'),
        'LOAD_ENV_QUOTED="hello world"\n'
      );

      loadEnv({ cwd: testDir });

      expect(process.env.LOAD_ENV_QUOTED).toBe('hello world');
    });

    it('should handle env files with comments', () => {
      fs.writeFileSync(
        path.join(testDir, '.env'),
        '# This is a comment\nLOAD_ENV_COMMENT_TEST=value\n# Another comment\n'
      );

      loadEnv({ cwd: testDir });

      expect(process.env.LOAD_ENV_COMMENT_TEST).toBe('value');
    });
  });
});
