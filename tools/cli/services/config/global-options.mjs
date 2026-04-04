/**
 * Registers the global CLI options shared across all commands.
 * @param {import('yargs').Argv} program
 */
export function registerGlobalOptions(program) {
  program.option('verbose', {
    alias: 'V',
    type: 'boolean',
    description: 'Run with verbose logging'
  });

  program.option('env', {
    alias: 'e',
    type: 'string',
    description: 'Load .env.[ENV] file (e.g. --env production loads .env.production)'
  });

  program.option('config', {
    alias: 'C',
    type: 'string',
    description: 'Path to config file (auto-discovers qelos.config.json / qelos.config.yaml)'
  });

  program.option('save', {
    alias: 'S',
    type: 'boolean',
    description: 'Save current command options to qelos.config.json'
  });

  program.option('global', {
    alias: 'g',
    type: 'string',
    description: 'Use a registered global environment (see `qelos global set`). Omit the value to use the "default" entry.'
  });
}
