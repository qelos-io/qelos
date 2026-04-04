const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

/**
 * Mirrors the logic from services/config/config-middleware.mjs for testability in CJS.
 */
function createConfigMiddleware({ keys, getDefaults, saveDefaults, getSaveKey }) {
  return (argv) => {
    const defaults = getDefaults(argv);
    if (defaults && typeof defaults === 'object') {
      for (const key of keys) {
        if (argv[key] === undefined && defaults[key] !== undefined) {
          argv[key] = defaults[key];
        }
      }
    }

    if (argv.save) {
      const saveKey = getSaveKey ? getSaveKey(argv) : true;
      if (saveKey) {
        const opts = {};
        for (const key of keys) {
          if (argv[key] !== undefined) {
            opts[key] = argv[key];
          }
        }
        saveDefaults(argv, opts, { verbose: argv.verbose });
      }
    }
  };
}

describe('createConfigMiddleware', () => {
  describe('loading defaults', () => {
    it('should apply defaults for undefined argv keys', () => {
      const middleware = createConfigMiddleware({
        keys: ['path', 'hard'],
        getDefaults: () => ({ path: './default', hard: true }),
        saveDefaults: () => {},
        getSaveKey: () => true,
      });

      const argv = {};
      middleware(argv);

      assert.strictEqual(argv.path, './default');
      assert.strictEqual(argv.hard, true);
    });

    it('should not override explicitly provided argv values', () => {
      const middleware = createConfigMiddleware({
        keys: ['path', 'hard'],
        getDefaults: () => ({ path: './default', hard: true }),
        saveDefaults: () => {},
        getSaveKey: () => true,
      });

      const argv = { path: './custom' };
      middleware(argv);

      assert.strictEqual(argv.path, './custom');
      assert.strictEqual(argv.hard, true);
    });

    it('should not override argv values set to false', () => {
      const middleware = createConfigMiddleware({
        keys: ['hard'],
        getDefaults: () => ({ hard: true }),
        saveDefaults: () => {},
        getSaveKey: () => true,
      });

      const argv = { hard: false };
      middleware(argv);

      assert.strictEqual(argv.hard, false);
    });

    it('should not override argv values set to empty string', () => {
      const middleware = createConfigMiddleware({
        keys: ['path'],
        getDefaults: () => ({ path: './default' }),
        saveDefaults: () => {},
        getSaveKey: () => true,
      });

      const argv = { path: '' };
      middleware(argv);

      assert.strictEqual(argv.path, '');
    });

    it('should handle null defaults gracefully', () => {
      const middleware = createConfigMiddleware({
        keys: ['path'],
        getDefaults: () => null,
        saveDefaults: () => {},
        getSaveKey: () => true,
      });

      const argv = {};
      middleware(argv);

      assert.strictEqual(argv.path, undefined);
    });

    it('should handle empty defaults object', () => {
      const middleware = createConfigMiddleware({
        keys: ['path'],
        getDefaults: () => ({}),
        saveDefaults: () => {},
        getSaveKey: () => true,
      });

      const argv = {};
      middleware(argv);

      assert.strictEqual(argv.path, undefined);
    });

    it('should pass argv to getDefaults for dynamic resolution', () => {
      let receivedArgv = null;
      const middleware = createConfigMiddleware({
        keys: ['path'],
        getDefaults: (argv) => { receivedArgv = argv; return {}; },
        saveDefaults: () => {},
        getSaveKey: () => true,
      });

      const argv = { type: 'components' };
      middleware(argv);

      assert.strictEqual(receivedArgv.type, 'components');
    });
  });

  describe('saving config', () => {
    it('should call saveDefaults when argv.save is true', () => {
      let savedOpts = null;
      const middleware = createConfigMiddleware({
        keys: ['path', 'hard'],
        getDefaults: () => ({}),
        saveDefaults: (_argv, opts) => { savedOpts = opts; },
        getSaveKey: () => true,
      });

      const argv = { save: true, path: './custom', hard: true };
      middleware(argv);

      assert.deepStrictEqual(savedOpts, { path: './custom', hard: true });
    });

    it('should not call saveDefaults when argv.save is falsy', () => {
      let called = false;
      const middleware = createConfigMiddleware({
        keys: ['path'],
        getDefaults: () => ({}),
        saveDefaults: () => { called = true; },
        getSaveKey: () => true,
      });

      const argv = { path: './custom' };
      middleware(argv);

      assert.strictEqual(called, false);
    });

    it('should not save when getSaveKey returns falsy', () => {
      let called = false;
      const middleware = createConfigMiddleware({
        keys: ['path'],
        getDefaults: () => ({}),
        saveDefaults: () => { called = true; },
        getSaveKey: () => null,
      });

      const argv = { save: true, path: './custom' };
      middleware(argv);

      assert.strictEqual(called, false);
    });

    it('should only save keys that are defined in argv', () => {
      let savedOpts = null;
      const middleware = createConfigMiddleware({
        keys: ['path', 'hard', 'filter'],
        getDefaults: () => ({}),
        saveDefaults: (_argv, opts) => { savedOpts = opts; },
        getSaveKey: () => true,
      });

      const argv = { save: true, path: './custom' };
      middleware(argv);

      assert.deepStrictEqual(savedOpts, { path: './custom' });
    });

    it('should pass verbose option to saveDefaults', () => {
      let receivedOptions = null;
      const middleware = createConfigMiddleware({
        keys: ['path'],
        getDefaults: () => ({}),
        saveDefaults: (_argv, _opts, options) => { receivedOptions = options; },
        getSaveKey: () => true,
      });

      const argv = { save: true, path: './custom', verbose: true };
      middleware(argv);

      assert.deepStrictEqual(receivedOptions, { verbose: true });
    });

    it('should include defaults that were applied when saving', () => {
      let savedOpts = null;
      const middleware = createConfigMiddleware({
        keys: ['path', 'hard'],
        getDefaults: () => ({ hard: true }),
        saveDefaults: (_argv, opts) => { savedOpts = opts; },
        getSaveKey: () => true,
      });

      const argv = { save: true, path: './custom' };
      middleware(argv);

      // hard was applied as default, then saved
      assert.deepStrictEqual(savedOpts, { path: './custom', hard: true });
    });
  });
});
