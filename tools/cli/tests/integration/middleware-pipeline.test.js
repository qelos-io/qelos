const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('Middleware pipeline', () => {
  describe('commands use createConfigMiddleware', () => {
    const commandsDir = path.join(__dirname, '..', '..', 'commands');

    const commandsWithConfig = ['push.mjs', 'pull.mjs', 'dump.mjs', 'restore.mjs', 'agent.mjs'];

    for (const file of commandsWithConfig) {
      it(`${file} should import createConfigMiddleware`, () => {
        const content = fs.readFileSync(path.join(commandsDir, file), 'utf-8');
        assert.ok(
          content.includes('createConfigMiddleware'),
          `${file} should use createConfigMiddleware`
        );
      });

      it(`${file} should not have inline config save/load boilerplate`, () => {
        const content = fs.readFileSync(path.join(commandsDir, file), 'utf-8');
        // The old pattern had for loops iterating KEYS
        const hasInlineLoop = /for\s*\(\s*const\s+key\s+of\s+\w+_KEYS/.test(content);
        assert.ok(
          !hasInlineLoop,
          `${file} should not have inline for-of loops for config keys — use createConfigMiddleware`
        );
      });
    }

    const commandsWithoutConfig = ['create.mjs', 'blueprints.mjs', 'get.mjs', 'global.mjs', 'generate.mjs'];

    for (const file of commandsWithoutConfig) {
      it(`${file} does not need config middleware`, () => {
        const content = fs.readFileSync(path.join(commandsDir, file), 'utf-8');
        // These commands don't use the config save/load pattern
        // Just verify they still export a default function
        assert.ok(
          content.includes('export default function'),
          `${file} should export a default function`
        );
      });
    }
  });

  describe('no imports from deleted utils/ folder', () => {
    const cliRoot = path.join(__dirname, '..', '..');
    const dirs = ['commands', 'controllers', 'services'];

    function collectMjsFiles(dir) {
      const results = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...collectMjsFiles(fullPath));
        } else if (entry.name.endsWith('.mjs') || entry.name.endsWith('.js')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    for (const dir of dirs) {
      const dirPath = path.join(cliRoot, dir);
      if (!fs.existsSync(dirPath)) continue;

      const files = collectMjsFiles(dirPath);
      for (const file of files) {
        const relPath = path.relative(cliRoot, file);
        it(`${relPath} should not import from utils/ folder`, () => {
          const content = fs.readFileSync(file, 'utf-8');
          // Check for imports pointing to the old top-level utils/ directory
          const hasOldUtils = /from\s+['"][.\/]*utils\/(colors|object-utils|streaming-markdown|markdown|progress-bar|process-handler)/.test(content);
          assert.ok(
            !hasOldUtils,
            `${relPath} still imports from the old utils/ folder`
          );
        });
      }
    }
  });

  describe('no CommonJS require() in .mjs files', () => {
    const cliRoot = path.join(__dirname, '..', '..');
    const dirs = ['commands', 'controllers', 'services', 'store'];

    function collectMjsFiles(dir) {
      const results = [];
      if (!fs.existsSync(dir)) return results;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          results.push(...collectMjsFiles(fullPath));
        } else if (entry.name.endsWith('.mjs')) {
          results.push(fullPath);
        }
      }
      return results;
    }

    for (const dir of dirs) {
      const dirPath = path.join(cliRoot, dir);
      const files = collectMjsFiles(dirPath);
      for (const file of files) {
        const relPath = path.relative(cliRoot, file);
        it(`${relPath} should not use require()`, () => {
          const content = fs.readFileSync(file, 'utf-8');
          // Exclude comments and strings that mention require
          const lines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
          const hasRequire = lines.some(l => /\brequire\s*\(/.test(l));
          assert.ok(
            !hasRequire,
            `${relPath} uses require() — should use ESM imports`
          );
        });
      }
    }
  });
});
