#!/usr/bin/env node
import 'zx/globals';

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import yargs from 'yargs'
import {hideBin} from 'yargs/helpers';
import process from 'node:process';
import createCommand from './commands/create.mjs';
import pushCommand from './commands/push.mjs';
import pullCommand from './commands/pull.mjs';
import blueprintsCommand from './commands/blueprints.mjs';
import dumpCommand from './commands/dump.mjs';
import restoreCommand from './commands/restore.mjs';
import getCommand from './commands/get.mjs';
import agentCommand from './commands/agent.mjs';
import generateCommand from './commands/generate.mjs';
import globalCommand from './commands/global.mjs';
import { loadEnv } from './services/config/load-env.mjs';
import { loadConfig } from './services/config/load-config.mjs';
import { getGlobal, setActiveGlobalDir } from './services/config/global-env.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));

const program = yargs(hideBin(process.argv));
const pkg = await fs.readJSON(join(__dirname, 'package.json'));
program.version(pkg.version)

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

// Auto-load .env files and config via middleware (runs before any command handler)
program.middleware((argv) => {
  let cwd = process.cwd();

  if (argv.global !== undefined) {
    const globalName = argv.global === '' ? 'default' : argv.global;
    const globalDir = getGlobal(globalName);
    if (globalDir && existsSync(globalDir)) {
      cwd = globalDir;
      setActiveGlobalDir(globalDir);
      if (argv.verbose) console.log(`Using global env "${globalName}": ${globalDir}`);
    } else {
      console.warn(`Global env "${globalName}" not found. Run: qelos global set${globalName !== 'default' ? ' ' + globalName : ''}`);
    }
  }

  loadEnv({ envSuffix: argv.env, cwd, verbose: argv.verbose });
  loadConfig({ configPath: argv.config, cwd, verbose: argv.verbose });
}, true); // true = run before validation

createCommand(program)
pushCommand(program)
pullCommand(program)
generateCommand(program)
blueprintsCommand(program)
dumpCommand(program)
restoreCommand(program)
getCommand(program)
agentCommand(program)
globalCommand(program)

;(async () => {

await program.help().parseAsync();
process.exit(0);
})();
