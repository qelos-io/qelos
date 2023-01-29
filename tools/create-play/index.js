#!/usr/bin/env node

const {execSync} = require('child_process');
const [, ,...argv] = process.argv;

execSync('npx @qelos/plugins-cli@latest create ' + argv.join(' '), {
  stdio: 'inherit',
});