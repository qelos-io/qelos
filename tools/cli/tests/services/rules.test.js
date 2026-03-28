const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/**
 * Mirrors parseCursorRuleFile from services/agent/rules.mjs for CJS testability.
 */
function parseCursorRuleFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n');

    if (lines[0]?.trim() !== '---') {
      return { globs: [], content: raw.trim(), description: '', alwaysApply: true };
    }

    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        endIdx = i;
        break;
      }
    }

    if (endIdx === -1) {
      return { globs: [], content: raw.trim(), description: '', alwaysApply: true };
    }

    const frontmatter = {};
    for (let i = 1; i < endIdx; i++) {
      const line = lines[i];
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        frontmatter[key] = value;
      }
    }

    const content = lines.slice(endIdx + 1).join('\n').trim();
    const globs = frontmatter.globs
      ? frontmatter.globs.split(',').map(g => g.trim()).filter(Boolean)
      : [];
    const alwaysApply = frontmatter.alwaysApply === 'true';
    const description = frontmatter.description || '';

    return { globs, content, description, alwaysApply };
  } catch {
    return null;
  }
}

/**
 * Mirrors matchGlob from services/agent/rules.mjs.
 */
function matchGlob(pattern, str) {
  const normalizedStr = str.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');

  let regexStr = '';
  let i = 0;
  while (i < normalizedPattern.length) {
    const c = normalizedPattern[i];
    if (c === '*') {
      if (normalizedPattern[i + 1] === '*') {
        if (normalizedPattern[i + 2] === '/') {
          regexStr += '(?:.*/)?';
          i += 3;
        } else {
          regexStr += '.*';
          i += 2;
        }
      } else {
        regexStr += '[^/]*';
        i++;
      }
    } else if (c === '?') {
      regexStr += '[^/]';
      i++;
    } else if (c === '[') {
      const end = normalizedPattern.indexOf(']', i);
      if (end > -1) {
        regexStr += normalizedPattern.slice(i, end + 1);
        i = end + 1;
      } else {
        regexStr += '\\[';
        i++;
      }
    } else if (c === '{') {
      const end = normalizedPattern.indexOf('}', i);
      if (end > -1) {
        const alternatives = normalizedPattern.slice(i + 1, end).split(',').map(a => a.trim());
        regexStr += '(?:' + alternatives.map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '[^/]*')).join('|') + ')';
        i = end + 1;
      } else {
        regexStr += '\\{';
        i++;
      }
    } else {
      regexStr += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i++;
    }
  }

  try {
    const regex = new RegExp('^' + regexStr + '$');
    return regex.test(normalizedStr);
  } catch {
    return false;
  }
}

/**
 * Mirrors loadCursorRules from services/agent/rules.mjs.
 */
function loadCursorRules(startDir) {
  let searchDir = startDir;
  let rulesDir = null;

  for (let i = 0; i < 5; i++) {
    const potentialDir = path.join(searchDir, '.cursor', 'rules');
    if (fs.existsSync(potentialDir) && fs.statSync(potentialDir).isDirectory()) {
      rulesDir = potentialDir;
      break;
    }
    const parentDir = path.dirname(searchDir);
    if (parentDir === searchDir) break;
    searchDir = parentDir;
  }

  if (!rulesDir) return [];

  const rules = [];
  try {
    const files = fs.readdirSync(rulesDir);
    for (const file of files) {
      if (!file.endsWith('.mdc')) continue;
      const filePath = path.join(rulesDir, file);
      const parsed = parseCursorRuleFile(filePath);
      if (parsed && parsed.content) {
        rules.push({ file: filePath, ...parsed });
      }
    }
  } catch {
    // ignore
  }

  return rules;
}

/**
 * Mirrors createRulesManager from services/agent/rules.mjs.
 */
function createRulesManager(allRules) {
  const sentRuleFiles = new Set();

  function getMatchingRules(filePath) {
    const matched = [];
    for (const rule of allRules) {
      if (sentRuleFiles.has(rule.file)) continue;
      if (rule.alwaysApply) continue;

      for (const glob of rule.globs) {
        const normalizedPath = filePath.replace(/\\/g, '/');
        const fileName = path.basename(filePath);
        if (matchGlob(glob, normalizedPath) || matchGlob(glob, fileName)) {
          sentRuleFiles.add(rule.file);
          matched.push(rule.content);
          break;
        }
      }
    }
    return matched;
  }

  function getAlwaysApplyRules() {
    const rules = [];
    for (const rule of allRules) {
      if (sentRuleFiles.has(rule.file)) continue;
      if (rule.alwaysApply || rule.globs.length === 0) {
        sentRuleFiles.add(rule.file);
        rules.push(rule.content);
      }
    }
    return rules;
  }

  function getSentRulesCount() {
    return sentRuleFiles.size;
  }

  return { getMatchingRules, getAlwaysApplyRules, getSentRulesCount };
}

// ── Tests ──

describe('cursor rules', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-test-'));
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // Helper to create a rules directory structure
  function createRulesDir(dir) {
    const rulesDir = path.join(dir, '.cursor', 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    return rulesDir;
  }

  function writeRule(rulesDir, fileName, content) {
    fs.writeFileSync(path.join(rulesDir, fileName), content, 'utf-8');
  }

  describe('parseCursorRuleFile', () => {
    it('parses frontmatter with globs', () => {
      const rulesDir = createRulesDir(testDir);
      const filePath = path.join(rulesDir, 'ts-rules.mdc');
      writeRule(rulesDir, 'ts-rules.mdc', `---
description: TypeScript conventions
globs: *.ts, src/**/*.tsx
alwaysApply: false
---
Use strict mode.`);

      const result = parseCursorRuleFile(filePath);
      assert.deepStrictEqual(result.globs, ['*.ts', 'src/**/*.tsx']);
      assert.strictEqual(result.content, 'Use strict mode.');
      assert.strictEqual(result.description, 'TypeScript conventions');
      assert.strictEqual(result.alwaysApply, false);
    });

    it('parses file without frontmatter as alwaysApply', () => {
      const rulesDir = createRulesDir(testDir);
      const filePath = path.join(rulesDir, 'general.mdc');
      writeRule(rulesDir, 'general.mdc', 'Always be helpful.');

      const result = parseCursorRuleFile(filePath);
      assert.deepStrictEqual(result.globs, []);
      assert.strictEqual(result.content, 'Always be helpful.');
      assert.strictEqual(result.alwaysApply, true);
    });

    it('parses alwaysApply: true', () => {
      const rulesDir = createRulesDir(testDir);
      const filePath = path.join(rulesDir, 'always.mdc');
      writeRule(rulesDir, 'always.mdc', `---
description: Always active
alwaysApply: true
---
Global rule.`);

      const result = parseCursorRuleFile(filePath);
      assert.strictEqual(result.alwaysApply, true);
      assert.deepStrictEqual(result.globs, []);
    });

    it('handles unclosed frontmatter as alwaysApply', () => {
      const rulesDir = createRulesDir(testDir);
      const filePath = path.join(rulesDir, 'broken.mdc');
      writeRule(rulesDir, 'broken.mdc', `---
description: broken
Some content here`);

      const result = parseCursorRuleFile(filePath);
      assert.strictEqual(result.alwaysApply, true);
    });

    it('returns null for non-existent file', () => {
      const result = parseCursorRuleFile('/nonexistent/path/file.mdc');
      assert.strictEqual(result, null);
    });

    it('handles empty content after frontmatter', () => {
      const rulesDir = createRulesDir(testDir);
      const filePath = path.join(rulesDir, 'empty.mdc');
      writeRule(rulesDir, 'empty.mdc', `---
description: Empty content
globs: *.ts
---
`);

      const result = parseCursorRuleFile(filePath);
      assert.strictEqual(result.content, '');
    });
  });

  describe('matchGlob', () => {
    it('matches simple wildcard *.ts', () => {
      assert.ok(matchGlob('*.ts', 'file.ts'));
      assert.ok(!matchGlob('*.ts', 'file.js'));
      assert.ok(!matchGlob('*.ts', 'src/file.ts'));
    });

    it('matches double wildcard **/*.ts', () => {
      assert.ok(matchGlob('**/*.ts', 'src/file.ts'));
      assert.ok(matchGlob('**/*.ts', 'src/deep/nested/file.ts'));
      assert.ok(matchGlob('**/*.ts', 'file.ts'));
    });

    it('matches directory prefix src/**/*.ts', () => {
      assert.ok(matchGlob('src/**/*.ts', 'src/file.ts'));
      assert.ok(matchGlob('src/**/*.ts', 'src/deep/file.ts'));
      assert.ok(!matchGlob('src/**/*.ts', 'lib/file.ts'));
    });

    it('matches ? single character', () => {
      assert.ok(matchGlob('file?.ts', 'file1.ts'));
      assert.ok(!matchGlob('file?.ts', 'file12.ts'));
    });

    it('matches character class [abc]', () => {
      assert.ok(matchGlob('file[abc].ts', 'filea.ts'));
      assert.ok(!matchGlob('file[abc].ts', 'filed.ts'));
    });

    it('matches brace expansion {ts,tsx}', () => {
      assert.ok(matchGlob('*.{ts,tsx}', 'file.ts'));
      assert.ok(matchGlob('*.{ts,tsx}', 'file.tsx'));
      assert.ok(!matchGlob('*.{ts,tsx}', 'file.js'));
    });

    it('normalizes backslashes', () => {
      assert.ok(matchGlob('src/**/*.ts', 'src\\deep\\file.ts'));
    });
  });

  describe('loadCursorRules', () => {
    it('loads rules from .cursor/rules directory', () => {
      const rulesDir = createRulesDir(testDir);
      writeRule(rulesDir, 'rule1.mdc', `---
description: Rule 1
globs: *.ts
---
TS rules`);
      writeRule(rulesDir, 'rule2.mdc', 'Always apply rule');

      const rules = loadCursorRules(testDir);
      assert.strictEqual(rules.length, 2);
    });

    it('only loads .mdc files', () => {
      const rulesDir = createRulesDir(testDir);
      writeRule(rulesDir, 'rule.mdc', 'Valid rule');
      writeRule(rulesDir, 'readme.md', 'Not a rule');
      writeRule(rulesDir, 'notes.txt', 'Not a rule');

      const rules = loadCursorRules(testDir);
      assert.strictEqual(rules.length, 1);
    });

    it('returns empty array when no .cursor/rules directory exists', () => {
      const rules = loadCursorRules(testDir);
      assert.deepStrictEqual(rules, []);
    });

    it('skips files with empty content', () => {
      const rulesDir = createRulesDir(testDir);
      writeRule(rulesDir, 'empty.mdc', `---
description: Empty
globs: *.ts
---
`);
      writeRule(rulesDir, 'valid.mdc', 'Has content');

      const rules = loadCursorRules(testDir);
      assert.strictEqual(rules.length, 1);
      assert.strictEqual(rules[0].content, 'Has content');
    });

    it('searches parent directories up to 5 levels', () => {
      // Create rules at root of test dir
      const rulesDir = createRulesDir(testDir);
      writeRule(rulesDir, 'rule.mdc', 'Parent rule');

      // Create nested subdirectory
      const nestedDir = path.join(testDir, 'a', 'b', 'c');
      fs.mkdirSync(nestedDir, { recursive: true });

      const rules = loadCursorRules(nestedDir);
      assert.strictEqual(rules.length, 1);
      assert.strictEqual(rules[0].content, 'Parent rule');
    });
  });

  describe('createRulesManager', () => {
    it('getAlwaysApplyRules returns rules with alwaysApply or no globs', () => {
      const allRules = [
        { file: 'a.mdc', globs: [], content: 'Always rule', alwaysApply: true },
        { file: 'b.mdc', globs: [], content: 'No glob rule', alwaysApply: false },
        { file: 'c.mdc', globs: ['*.ts'], content: 'TS rule', alwaysApply: false },
      ];

      const manager = createRulesManager(allRules);
      const rules = manager.getAlwaysApplyRules();

      assert.deepStrictEqual(rules, ['Always rule', 'No glob rule']);
    });

    it('getMatchingRules returns rules matching file path', () => {
      const allRules = [
        { file: 'ts.mdc', globs: ['*.ts'], content: 'TS rule', alwaysApply: false },
        { file: 'js.mdc', globs: ['*.js'], content: 'JS rule', alwaysApply: false },
      ];

      const manager = createRulesManager(allRules);
      const matched = manager.getMatchingRules('component.ts');

      assert.deepStrictEqual(matched, ['TS rule']);
    });

    it('each rule is only returned once per session', () => {
      const allRules = [
        { file: 'ts.mdc', globs: ['*.ts'], content: 'TS rule', alwaysApply: false },
      ];

      const manager = createRulesManager(allRules);

      const first = manager.getMatchingRules('file1.ts');
      assert.deepStrictEqual(first, ['TS rule']);

      const second = manager.getMatchingRules('file2.ts');
      assert.deepStrictEqual(second, []);
    });

    it('alwaysApply rules are not returned by getMatchingRules', () => {
      const allRules = [
        { file: 'always.mdc', globs: [], content: 'Always', alwaysApply: true },
        { file: 'ts.mdc', globs: ['*.ts'], content: 'TS', alwaysApply: false },
      ];

      const manager = createRulesManager(allRules);
      const matched = manager.getMatchingRules('file.ts');

      assert.deepStrictEqual(matched, ['TS']);
    });

    it('getSentRulesCount tracks sent rules', () => {
      const allRules = [
        { file: 'a.mdc', globs: [], content: 'A', alwaysApply: true },
        { file: 'b.mdc', globs: ['*.ts'], content: 'B', alwaysApply: false },
        { file: 'c.mdc', globs: ['*.js'], content: 'C', alwaysApply: false },
      ];

      const manager = createRulesManager(allRules);
      assert.strictEqual(manager.getSentRulesCount(), 0);

      manager.getAlwaysApplyRules();
      assert.strictEqual(manager.getSentRulesCount(), 1);

      manager.getMatchingRules('file.ts');
      assert.strictEqual(manager.getSentRulesCount(), 2);
    });

    it('matches against both full path and filename', () => {
      const allRules = [
        { file: 'ts.mdc', globs: ['*.ts'], content: 'TS', alwaysApply: false },
      ];

      const manager = createRulesManager(allRules);
      // full path won't match *.ts, but filename will
      const matched = manager.getMatchingRules('src/components/Button.ts');
      assert.deepStrictEqual(matched, ['TS']);
    });

    it('matches deep glob patterns against full path', () => {
      const allRules = [
        { file: 'src.mdc', globs: ['src/**/*.ts'], content: 'Src TS', alwaysApply: false },
      ];

      const manager = createRulesManager(allRules);
      const matched = manager.getMatchingRules('src/components/Button.ts');
      assert.deepStrictEqual(matched, ['Src TS']);
    });

    it('does not match unrelated paths', () => {
      const allRules = [
        { file: 'ts.mdc', globs: ['*.ts'], content: 'TS', alwaysApply: false },
      ];

      const manager = createRulesManager(allRules);
      const matched = manager.getMatchingRules('file.js');
      assert.deepStrictEqual(matched, []);
    });

    it('handles multiple globs per rule', () => {
      const allRules = [
        { file: 'web.mdc', globs: ['*.ts', '*.tsx', '*.vue'], content: 'Web rule', alwaysApply: false },
      ];

      const manager = createRulesManager(allRules);

      const matched = manager.getMatchingRules('Component.vue');
      assert.deepStrictEqual(matched, ['Web rule']);
    });
  });

  describe('rules integration with agent workflow', () => {
    it('first request gets alwaysApply rules, subsequent file ops get matching rules', () => {
      const allRules = [
        { file: 'general.mdc', globs: [], content: 'General guidance', alwaysApply: true },
        { file: 'ts.mdc', globs: ['*.ts'], content: 'TypeScript conventions', alwaysApply: false },
        { file: 'vue.mdc', globs: ['*.vue'], content: 'Vue conventions', alwaysApply: false },
      ];

      const manager = createRulesManager(allRules);
      let pendingRules = [];

      // Step 1: Initial request - collect alwaysApply rules
      pendingRules = manager.getAlwaysApplyRules();
      assert.deepStrictEqual(pendingRules, ['General guidance']);

      // Simulate sending them in chat options
      const firstOpts = {};
      if (pendingRules.length > 0) {
        firstOpts.rules = [...pendingRules];
        pendingRules = [];
      }
      assert.deepStrictEqual(firstOpts.rules, ['General guidance']);

      // Step 2: File tool reads a .ts file
      const tsMatched = manager.getMatchingRules('src/utils.ts');
      pendingRules.push(...tsMatched);
      assert.deepStrictEqual(pendingRules, ['TypeScript conventions']);

      // Step 3: File tool reads a .vue file in same turn
      const vueMatched = manager.getMatchingRules('src/App.vue');
      pendingRules.push(...vueMatched);
      assert.deepStrictEqual(pendingRules, ['TypeScript conventions', 'Vue conventions']);

      // Send all pending rules
      const secondOpts = {};
      if (pendingRules.length > 0) {
        secondOpts.rules = [...pendingRules];
        pendingRules = [];
      }
      assert.deepStrictEqual(secondOpts.rules, ['TypeScript conventions', 'Vue conventions']);

      // Step 4: Reading another .ts file should NOT re-send the TS rule
      const noMatch = manager.getMatchingRules('src/other.ts');
      assert.deepStrictEqual(noMatch, []);
      assert.strictEqual(manager.getSentRulesCount(), 3);
    });

    it('rules are only included when --rules flag or env var is set', () => {
      // Simulate the flag check from the controller
      const checkRulesEnabled = (rulesFlag, envVar) => {
        return rulesFlag || envVar === 'true';
      };

      assert.strictEqual(checkRulesEnabled(true, undefined), true);
      assert.strictEqual(checkRulesEnabled(false, 'true'), true);
      assert.strictEqual(checkRulesEnabled(false, undefined), false);
      assert.strictEqual(checkRulesEnabled(false, 'false'), false);
      assert.strictEqual(checkRulesEnabled(undefined, 'true'), true);
    });
  });
});
