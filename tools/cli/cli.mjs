#!/usr/bin/env node
import 'zx/globals';

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs'
import {hideBin} from 'yargs/helpers';
import process from 'node:process';
import createCommand from './commands/create.mjs';

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

program.help().argv;
