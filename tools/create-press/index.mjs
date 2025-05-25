#!/usr/bin/env node

import { execSync } from 'child_process';

const [ , , ...argv ] = process.argv;

execSync('npx @qelos/cli create ' + argv.join(' '), { stdio: 'inherit' });
