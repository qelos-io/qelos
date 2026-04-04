const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('Global Options', () => {
  const filePath = path.join(__dirname, '..', '..', 'services', 'config', 'global-options.mjs');

  it('should exist as a module', () => {
    assert.ok(fs.existsSync(filePath));
  });

  it('should export registerGlobalOptions function', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export function registerGlobalOptions'));
  });

  it('should define all expected global options', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const expectedOptions = ['verbose', 'env', 'config', 'save', 'global'];

    for (const opt of expectedOptions) {
      assert.ok(
        content.includes(`'${opt}'`),
        `Should define option "${opt}"`
      );
    }
  });

  it('should define aliases for all global options', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const expectedAliases = ['V', 'e', 'C', 'S', 'g'];

    for (const alias of expectedAliases) {
      assert.ok(
        content.includes(`'${alias}'`),
        `Should define alias "${alias}"`
      );
    }
  });
});

describe('Global Middleware', () => {
  const filePath = path.join(__dirname, '..', '..', 'services', 'config', 'global-middleware.mjs');

  it('should exist as a module', () => {
    assert.ok(fs.existsSync(filePath));
  });

  it('should export globalMiddleware function', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('export function globalMiddleware'));
  });

  it('should import loadEnv', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('loadEnv'));
  });

  it('should import loadConfig', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('loadConfig'));
  });

  it('should handle the --global flag', () => {
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('argv.global'));
    assert.ok(content.includes('getGlobal'));
    assert.ok(content.includes('setActiveGlobalDir'));
  });
});
