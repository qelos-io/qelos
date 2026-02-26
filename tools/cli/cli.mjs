#!/usr/bin/env node
import 'zx/globals';

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { loadEnv } from './services/load-env.mjs';
import { loadConfig } from './services/load-config.mjs';
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

// Auto-load .env files and config via middleware (runs before any command handler)
program.middleware((argv) => {
  loadEnv({ envSuffix: argv.env, verbose: argv.verbose });
  loadConfig({ configPath: argv.config, verbose: argv.verbose });
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

;(async () => {

await program.help().parseAsync();
process.exit(0);
})();
