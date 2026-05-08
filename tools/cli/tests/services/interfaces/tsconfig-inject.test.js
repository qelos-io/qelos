const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(
  path.join(__dirname, '..', '..', '..', 'services', 'interfaces', 'tsconfig-inject.mjs')
).href;

describe('tsconfig-inject', () => {
  let testDir;
  let mod;

  beforeEach(async () => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsconfig-inject-test-'));
    if (!mod) mod = await import(moduleUrl);
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('stripJsonComments', () => {
    it('removes // line comments', () => {
      const out = mod.stripJsonComments('{\n  // a comment\n  "a": 1\n}');
      assert.deepStrictEqual(JSON.parse(out), { a: 1 });
    });

    it('removes /* block */ comments', () => {
      const out = mod.stripJsonComments('{\n  /* hello */\n  "a": 1\n}');
      assert.deepStrictEqual(JSON.parse(out), { a: 1 });
    });

    it('removes trailing commas in arrays and objects', () => {
      const out = mod.stripJsonComments('{\n  "a": [1, 2,],\n  "b": {"c": 3,},\n}');
      assert.deepStrictEqual(JSON.parse(out), { a: [1, 2], b: { c: 3 } });
    });

    it('keeps comment-like sequences inside strings intact', () => {
      const out = mod.stripJsonComments('{"a": "// not a comment", "b": "/* also no */"}');
      assert.deepStrictEqual(JSON.parse(out), { a: '// not a comment', b: '/* also no */' });
    });
  });

  describe('parseTsconfig', () => {
    it('parses a tsconfig.json with comments and trailing commas', () => {
      const source = `{
        // primary config
        "compilerOptions": {
          "target": "ES2022", /* modern */
          "strict": true,
        },
        "include": ["src/**/*"],
      }`;
      const parsed = mod.parseTsconfig(source);
      assert.strictEqual(parsed.compilerOptions.target, 'ES2022');
      assert.deepStrictEqual(parsed.include, ['src/**/*']);
    });
  });

  describe('toIncludeEntry', () => {
    it('returns a forward-slash relative path with leading "./"', () => {
      const entry = mod.toIncludeEntry(path.join(testDir), path.join(testDir, 'types', 'qelos-blueprints.d.ts'));
      assert.strictEqual(entry, './types/qelos-blueprints.d.ts');
    });

    it('handles absolute generated paths outside tsconfig dir', () => {
      const tsDir = path.join(testDir, 'project');
      fs.mkdirSync(tsDir, { recursive: true });
      const generated = path.join(testDir, 'shared', 'qelos-blueprints.d.ts');
      const entry = mod.toIncludeEntry(tsDir, generated);
      assert.ok(entry.startsWith('..'), `expected ".." prefix, got "${entry}"`);
      assert.ok(!entry.includes('\\'), 'should normalize backslashes');
    });
  });

  describe('findTsconfig', () => {
    it('returns the tsconfig.json path when present', () => {
      fs.writeFileSync(path.join(testDir, 'tsconfig.json'), '{}');
      assert.strictEqual(mod.findTsconfig(testDir), path.join(testDir, 'tsconfig.json'));
    });

    it('returns null when missing', () => {
      assert.strictEqual(mod.findTsconfig(testDir), null);
    });
  });

  describe('injectIntoTsconfig', () => {
    it('adds the generated file path to include when not present', () => {
      const tsconfigPath = path.join(testDir, 'tsconfig.json');
      fs.writeFileSync(tsconfigPath, JSON.stringify({
        compilerOptions: { strict: true },
        include: ['src/**/*'],
      }, null, 2));

      const generated = path.join(testDir, 'types', 'qelos-blueprints.d.ts');
      const result = mod.injectIntoTsconfig({ tsconfigPath, generatedFilePath: generated });

      assert.strictEqual(result.updated, true);
      assert.strictEqual(result.entry, './types/qelos-blueprints.d.ts');

      const written = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      assert.deepStrictEqual(written.include, ['src/**/*', './types/qelos-blueprints.d.ts']);
      assert.strictEqual(written.compilerOptions.strict, true);
    });

    it('creates an include array when tsconfig has none', () => {
      const tsconfigPath = path.join(testDir, 'tsconfig.json');
      fs.writeFileSync(tsconfigPath, JSON.stringify({ compilerOptions: { strict: true } }, null, 2));

      const generated = path.join(testDir, 'types', 'qelos-blueprints.d.ts');
      const result = mod.injectIntoTsconfig({ tsconfigPath, generatedFilePath: generated });

      assert.strictEqual(result.updated, true);
      const written = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      assert.deepStrictEqual(written.include, ['./types/qelos-blueprints.d.ts']);
    });

    it('is idempotent on the second run', () => {
      const tsconfigPath = path.join(testDir, 'tsconfig.json');
      fs.writeFileSync(tsconfigPath, JSON.stringify({ include: ['src/**/*'] }, null, 2));

      const generated = path.join(testDir, 'types', 'qelos-blueprints.d.ts');
      const first = mod.injectIntoTsconfig({ tsconfigPath, generatedFilePath: generated });
      assert.strictEqual(first.updated, true);

      const beforeSecond = fs.readFileSync(tsconfigPath, 'utf-8');
      const second = mod.injectIntoTsconfig({ tsconfigPath, generatedFilePath: generated });
      const afterSecond = fs.readFileSync(tsconfigPath, 'utf-8');

      assert.strictEqual(second.updated, false);
      assert.strictEqual(beforeSecond, afterSecond, 'file should not be rewritten when entry already present');
    });

    it('tolerates a tsconfig.json with comments and trailing commas', () => {
      const tsconfigPath = path.join(testDir, 'tsconfig.json');
      fs.writeFileSync(tsconfigPath, [
        '{',
        '  // primary config',
        '  "compilerOptions": {',
        '    "strict": true,',
        '  },',
        '  "include": ["src/**/*",],',
        '}',
      ].join('\n'));

      const generated = path.join(testDir, 'types', 'qelos-blueprints.d.ts');
      const result = mod.injectIntoTsconfig({ tsconfigPath, generatedFilePath: generated });

      assert.strictEqual(result.updated, true);
      const written = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      assert.deepStrictEqual(written.include, ['src/**/*', './types/qelos-blueprints.d.ts']);
    });

    it('treats normalized forward-slash and backslash entries as equivalent', () => {
      const tsconfigPath = path.join(testDir, 'tsconfig.json');
      fs.writeFileSync(tsconfigPath, JSON.stringify({
        include: ['./types\\qelos-blueprints.d.ts'],
      }, null, 2));

      const generated = path.join(testDir, 'types', 'qelos-blueprints.d.ts');
      const result = mod.injectIntoTsconfig({ tsconfigPath, generatedFilePath: generated });
      assert.strictEqual(result.updated, false);
    });
  });
});
