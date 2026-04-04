const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('Command Registry', () => {
  const commandsDir = path.join(__dirname, '..', '..', 'commands');

  it('should have an index.mjs file', () => {
    assert.ok(fs.existsSync(path.join(commandsDir, 'index.mjs')));
  });

  it('should list all command files in the registry', () => {
    const indexContent = fs.readFileSync(path.join(commandsDir, 'index.mjs'), 'utf-8');

    // Get all .mjs command files except index.mjs
    const commandFiles = fs.readdirSync(commandsDir)
      .filter(f => f.endsWith('.mjs') && f !== 'index.mjs');

    for (const file of commandFiles) {
      const importName = `./${file}`;
      assert.ok(
        indexContent.includes(importName),
        `Command file "${file}" should be imported in commands/index.mjs`
      );
    }
  });

  it('should export a commands array', () => {
    const indexContent = fs.readFileSync(path.join(commandsDir, 'index.mjs'), 'utf-8');
    assert.ok(indexContent.includes('export const commands'), 'Should export commands array');
  });

  it('should export a registerCommands function', () => {
    const indexContent = fs.readFileSync(path.join(commandsDir, 'index.mjs'), 'utf-8');
    assert.ok(indexContent.includes('export function registerCommands'), 'Should export registerCommands function');
  });

  it('every command file should export a default function', () => {
    const commandFiles = fs.readdirSync(commandsDir)
      .filter(f => f.endsWith('.mjs') && f !== 'index.mjs');

    for (const file of commandFiles) {
      const content = fs.readFileSync(path.join(commandsDir, file), 'utf-8');
      assert.ok(
        content.includes('export default function'),
        `${file} should export a default function`
      );
    }
  });

  it('should have the expected number of commands (10)', () => {
    const commandFiles = fs.readdirSync(commandsDir)
      .filter(f => f.endsWith('.mjs') && f !== 'index.mjs');

    assert.strictEqual(commandFiles.length, 10, 'Should have 10 command files');
  });

  it('should include all expected command names', () => {
    const expectedCommands = [
      'agent', 'blueprints', 'create', 'dump', 'generate',
      'get', 'global', 'pull', 'push', 'restore'
    ];

    const commandFiles = fs.readdirSync(commandsDir)
      .filter(f => f.endsWith('.mjs') && f !== 'index.mjs')
      .map(f => f.replace('.mjs', ''))
      .sort();

    assert.deepStrictEqual(commandFiles, expectedCommands.sort());
  });
});
