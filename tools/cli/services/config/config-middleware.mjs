/**
 * Creates a reusable yargs middleware that applies config defaults
 * and optionally persists current options back to qelos.config.json.
 *
 * @param {object} options
 * @param {string[]} options.keys - Argv keys to load/save
 * @param {function} options.getDefaults - (argv) => defaults object
 * @param {function} options.saveDefaults - (argv, opts, { verbose }) => void
 * @param {function} [options.getSaveKey] - (argv) => string | null — if null, skip save
 * @returns {function} yargs middleware
 */
export function createConfigMiddleware({ keys, getDefaults, saveDefaults, getSaveKey }) {
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
