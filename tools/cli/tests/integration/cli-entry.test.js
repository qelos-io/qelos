const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const CLI_PATH = path.join(__dirname, '..', '..', 'cli.mjs');

describe('CLI entry point (cli.mjs)', () => {
  const content = fs.readFileSync(CLI_PATH, 'utf-8');

  it('should have a shebang line', () => {
    assert.ok(content.startsWith('#!/usr/bin/env node'));
  });

  it('should import registerCommands from commands/index.mjs', () => {
    assert.ok(content.includes("from './commands/index.mjs'"));
  });

  it('should import registerGlobalOptions from global-options.mjs', () => {
    assert.ok(content.includes("from './services/config/global-options.mjs'"));
  });

  it('should import globalMiddleware from global-middleware.mjs', () => {
    assert.ok(content.includes("from './services/config/global-middleware.mjs'"));
  });

  it('should call registerGlobalOptions before registerCommands', () => {
    const optionsIdx = content.indexOf('registerGlobalOptions(program)');
    const commandsIdx = content.indexOf('registerCommands(program)');
    assert.ok(optionsIdx > -1, 'registerGlobalOptions should be called');
    assert.ok(commandsIdx > -1, 'registerCommands should be called');
    assert.ok(optionsIdx < commandsIdx, 'Options should be registered before commands');
  });

  it('should register globalMiddleware before registerCommands', () => {
    const middlewareIdx = content.indexOf('program.middleware(globalMiddleware');
    const commandsIdx = content.indexOf('registerCommands(program)');
    assert.ok(middlewareIdx > -1, 'globalMiddleware should be registered');
    assert.ok(middlewareIdx < commandsIdx, 'Middleware should be registered before commands');
  });

  it('should not contain individual command imports', () => {
    const individualImports = [
      "from './commands/create.mjs'",
      "from './commands/push.mjs'",
      "from './commands/pull.mjs'",
      "from './commands/agent.mjs'",
      "from './commands/dump.mjs'",
    ];
    for (const imp of individualImports) {
      assert.ok(
        !content.includes(imp),
        `cli.mjs should not directly import ${imp} — use registry instead`
      );
    }
  });

  it('should not contain inline option definitions', () => {
    // These were moved to global-options.mjs
    assert.ok(
      !content.includes("program.option('verbose'"),
      'verbose option should be in global-options.mjs, not cli.mjs'
    );
    assert.ok(
      !content.includes("program.option('env'"),
      'env option should be in global-options.mjs, not cli.mjs'
    );
  });

  it('should not contain inline middleware logic', () => {
    // loadEnv/loadConfig logic was moved to global-middleware.mjs
    assert.ok(
      !content.includes('loadEnv'),
      'loadEnv should be in global-middleware.mjs, not cli.mjs'
    );
    assert.ok(
      !content.includes('loadConfig'),
      'loadConfig should be in global-middleware.mjs, not cli.mjs'
    );
  });

  it('should be under 30 lines of code (excluding blank lines)', () => {
    const codeLines = content.split('\n').filter(l => l.trim().length > 0);
    assert.ok(
      codeLines.length <= 30,
      `cli.mjs should be lean (<= 30 lines), got ${codeLines.length}`
    );
  });
});
