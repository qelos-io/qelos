#!/usr/bin/env node

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { version } = require('./package.json')

const program = yargs(hideBin(process.argv));

program.version(version)

program.option('verbose', {
  alias: 'V',
  type: 'boolean',
  description: 'Run with verbose logging'
});

require('./commands/create')(program)
// require('./commands/compose')(program)

program.help().argv;
