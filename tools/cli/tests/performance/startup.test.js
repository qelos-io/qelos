const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execSync } = require('node:child_process');
const path = require('node:path');

const CLI_PATH = path.join(__dirname, '..', '..', 'cli.mjs');

describe('Performance', () => {
  describe('CLI startup time', () => {
    it('should display --help in under 5 seconds', () => {
      const start = performance.now();
      try {
        execSync(`node ${CLI_PATH} --help`, {
          timeout: 5000,
          stdio: 'pipe',
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
        });
      } catch (err) {
        // --help causes yargs to exit with code 0, but execSync may still throw
        if (err.status !== 0 && err.status !== null) {
          throw err;
        }
      }
      const elapsed = performance.now() - start;
      console.log(`    startup (--help): ${elapsed.toFixed(0)}ms`);
      assert.ok(elapsed < 5000, `CLI startup took ${elapsed.toFixed(0)}ms, expected < 5000ms`);
    });

    it('should display --version in under 3 seconds', () => {
      const start = performance.now();
      try {
        execSync(`node ${CLI_PATH} --version`, {
          timeout: 3000,
          stdio: 'pipe',
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
        });
      } catch (err) {
        if (err.status !== 0 && err.status !== null) {
          throw err;
        }
      }
      const elapsed = performance.now() - start;
      console.log(`    startup (--version): ${elapsed.toFixed(0)}ms`);
      assert.ok(elapsed < 3000, `CLI --version took ${elapsed.toFixed(0)}ms, expected < 3000ms`);
    });
  });

  describe('Command parsing overhead', () => {
    it('should parse an unknown command quickly (< 5s)', () => {
      const start = performance.now();
      try {
        execSync(`node ${CLI_PATH} nonexistent-command 2>&1`, {
          timeout: 5000,
          stdio: 'pipe',
          env: { ...process.env, NODE_NO_WARNINGS: '1' },
        });
      } catch {
        // Expected to fail with unknown command
      }
      const elapsed = performance.now() - start;
      console.log(`    unknown command parse: ${elapsed.toFixed(0)}ms`);
      assert.ok(elapsed < 5000, `Unknown command parse took ${elapsed.toFixed(0)}ms, expected < 5000ms`);
    });
  });

  describe('Module import cost', () => {
    it('commands/index.mjs should have fewer than 15 import statements', () => {
      const fs = require('node:fs');
      const content = fs.readFileSync(
        path.join(__dirname, '..', '..', 'commands', 'index.mjs'),
        'utf-8'
      );
      const importCount = (content.match(/^import\s/gm) || []).length;
      console.log(`    commands/index.mjs imports: ${importCount}`);
      assert.ok(importCount <= 15, `Too many imports (${importCount}), consider lazy loading`);
    });

    it('cli.mjs should have fewer than 10 import statements', () => {
      const fs = require('node:fs');
      const content = fs.readFileSync(CLI_PATH, 'utf-8');
      const importCount = (content.match(/^import\s/gm) || []).length;
      console.log(`    cli.mjs imports: ${importCount}`);
      assert.ok(importCount <= 10, `cli.mjs has too many imports (${importCount})`);
    });

    it('cli.mjs should be under 30 lines total', () => {
      const fs = require('node:fs');
      const content = fs.readFileSync(CLI_PATH, 'utf-8');
      const lineCount = content.split('\n').length;
      console.log(`    cli.mjs lines: ${lineCount}`);
      assert.ok(lineCount <= 30, `cli.mjs has ${lineCount} lines, expected <= 30`);
    });
  });
});
