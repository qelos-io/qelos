#!/usr/bin/env node
import 'zx/globals';

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yargs from 'yargs'
import {hideBin} from 'yargs/helpers';
import process from 'node:process';
import { registerCommands } from './commands/index.mjs';
import { registerGlobalOptions } from './services/config/global-options.mjs';
import { globalMiddleware } from './services/config/global-middleware.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));

const program = yargs(hideBin(process.argv));
const pkg = await fs.readJSON(join(__dirname, 'package.json'));
program.version(pkg.version)

registerGlobalOptions(program);
program.middleware(globalMiddleware, true);
registerCommands(program);

;(async () => {

await program.help().parseAsync();
process.exit(0);
})();
