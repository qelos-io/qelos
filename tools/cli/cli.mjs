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
import generateCommand from './commands/generate.mjs';
import blueprintsCommand from './commands/blueprints.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));

const program = yargs(hideBin(process.argv));
const pkg = await fs.readJSON(join(__dirname, 'package.json'));
program.version(pkg.version)

program.option('verbose', {
  alias: 'V',
  type: 'boolean',
  description: 'Run with verbose logging'
});

createCommand(program)
pushCommand(program)
pullCommand(program)
generateCommand(program)
blueprintsCommand(program)

program.help().argv;
