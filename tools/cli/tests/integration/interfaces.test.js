const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CLI_DIR = path.join(__dirname, '..', '..');
const CLI_PATH = path.join(CLI_DIR, 'cli.mjs');

function writeBlueprint(dir, identifier, body) {
  fs.writeFileSync(
    path.join(dir, `${identifier}.blueprint.json`),
    JSON.stringify({ identifier, ...body }, null, 2)
  );
}

function runCli(args, { cwd, env } = {}) {
  const argv = Array.isArray(args) ? args : args.split(/\s+/).filter(Boolean);
  const result = spawnSync('node', [CLI_PATH, ...argv], {
    cwd,
    env: { ...process.env, ...(env || {}) },
    encoding: 'utf8',
    shell: false,
  });
  const output = (result.stdout || '') + (result.stderr || '');
  return { success: result.status === 0, output, status: result.status };
}

describe('qelos interfaces build (integration)', () => {
  let testDir;
  let blueprintsDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qelos-interfaces-test-'));
    blueprintsDir = path.join(testDir, 'blueprints');
    fs.mkdirSync(blueprintsDir, { recursive: true });

    writeBlueprint(blueprintsDir, 'todo', {
      name: 'Todo',
      properties: {
        title: { type: 'string', required: true },
        completed: { type: 'boolean', required: false },
        status: { type: 'string', required: true, enum: ['open', 'done'] },
      },
      relations: [{ key: 'project', target: 'project' }],
    });
    writeBlueprint(blueprintsDir, 'project', {
      name: 'Project',
      properties: {
        name: { type: 'string', required: true },
      },
    });
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('generates qelos-blueprints.d.ts in the default ./types directory', () => {
    const result = runCli('interfaces build', { cwd: testDir });
    assert.ok(result.success, `command failed:\n${result.output}`);

    const generated = path.join(testDir, 'types', 'qelos-blueprints.d.ts');
    assert.ok(fs.existsSync(generated), `expected generated file at ${generated}`);

    const content = fs.readFileSync(generated, 'utf-8');
    assert.ok(content.startsWith('// AUTO-GENERATED — DO NOT EDIT'));
    assert.ok(content.includes('export interface TodoEntity extends IBaseBlueprintEntity, TodoProperties {}'));
    assert.ok(content.includes('export interface ProjectEntity extends IBaseBlueprintEntity, ProjectProperties {}'));
    assert.ok(content.includes('export interface BlueprintEntitiesRegistry {'));
    assert.ok(content.includes("declare module '@qelos/sdk' {"));
  });

  it('honors the --out flag', () => {
    const result = runCli('interfaces build --out ./generated', { cwd: testDir });
    assert.ok(result.success, `command failed:\n${result.output}`);

    const generated = path.join(testDir, 'generated', 'qelos-blueprints.d.ts');
    assert.ok(fs.existsSync(generated));
  });

  it('honors a positional source path', () => {
    const altDir = path.join(testDir, 'other-bp');
    fs.mkdirSync(altDir, { recursive: true });
    writeBlueprint(altDir, 'note', {
      properties: { body: { type: 'string', required: true } },
    });

    const result = runCli('interfaces build ./other-bp', { cwd: testDir });
    assert.ok(result.success, `command failed:\n${result.output}`);

    const content = fs.readFileSync(path.join(testDir, 'types', 'qelos-blueprints.d.ts'), 'utf-8');
    assert.ok(content.includes('NoteEntity'));
    assert.ok(!content.includes('TodoEntity'), 'should not include blueprints from default ./blueprints when path overridden');
  });

  it('reads `interfaces` defaults from qelos.config.json', () => {
    fs.writeFileSync(
      path.join(testDir, 'qelos.config.json'),
      JSON.stringify({ interfaces: { out: './from-config' } })
    );

    const result = runCli('interfaces build', { cwd: testDir });
    assert.ok(result.success, `command failed:\n${result.output}`);

    const generated = path.join(testDir, 'from-config', 'qelos-blueprints.d.ts');
    assert.ok(fs.existsSync(generated));
  });

  it('updates tsconfig.json `include` idempotently', () => {
    const tsconfigPath = path.join(testDir, 'tsconfig.json');
    fs.writeFileSync(tsconfigPath, JSON.stringify({
      compilerOptions: { strict: true },
      include: ['src/**/*'],
    }, null, 2));

    const first = runCli('interfaces build', { cwd: testDir });
    assert.ok(first.success, `first run failed:\n${first.output}`);

    const afterFirst = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
    assert.deepStrictEqual(afterFirst.include, ['src/**/*', './types/qelos-blueprints.d.ts']);

    const beforeSecond = fs.readFileSync(tsconfigPath, 'utf-8');
    const second = runCli('interfaces build', { cwd: testDir });
    assert.ok(second.success, `second run failed:\n${second.output}`);
    const afterSecond = fs.readFileSync(tsconfigPath, 'utf-8');
    assert.strictEqual(beforeSecond, afterSecond, 'tsconfig.json should be unchanged on idempotent run');
  });

  it('warns and skips when no tsconfig.json is present', () => {
    const result = runCli('interfaces build', { cwd: testDir });
    assert.ok(result.success, `command failed:\n${result.output}`);
    assert.ok(
      result.output.includes('No tsconfig.json found') || result.output.includes('skipping'),
      `expected a warning about missing tsconfig.json, got:\n${result.output}`
    );
  });

  it('errors with a friendly message when the blueprints folder is missing', () => {
    fs.rmSync(blueprintsDir, { recursive: true, force: true });

    const result = runCli('interfaces build', { cwd: testDir });
    assert.ok(!result.success);
    assert.ok(result.output.includes('Blueprints folder not found'));
    assert.ok(result.output.includes('qelos pull blueprints'));
  });

  it('generates a Python module when --lang py is passed', () => {
    const result = runCli('interfaces build --lang py', { cwd: testDir });
    assert.ok(result.success, `command failed:\n${result.output}`);

    const generated = path.join(testDir, 'types', 'qelos_blueprints.py');
    assert.ok(fs.existsSync(generated), `expected generated python file at ${generated}`);

    const content = fs.readFileSync(generated, 'utf-8');
    assert.ok(content.startsWith('# AUTO-GENERATED — DO NOT EDIT'));
    assert.ok(content.includes('import datetime'));
    assert.ok(content.includes('from typing import'));
    assert.ok(content.includes('from typing_extensions import NotRequired'));
    assert.ok(content.includes('class TodoProperties(TypedDict):'));
    assert.ok(content.includes('class TodoEntity(TodoProperties):'));
    assert.ok(content.includes('    title: str'));
    assert.ok(content.includes('    completed: NotRequired[bool]'));
    assert.ok(content.includes('    status: Literal["open", "done"]'));
    assert.ok(content.includes('    project: NotRequired[Union["ProjectEntity", str]]'));
  });

  it('skips tsconfig injection in --lang py mode', () => {
    const tsconfigPath = path.join(testDir, 'tsconfig.json');
    fs.writeFileSync(tsconfigPath, JSON.stringify({
      compilerOptions: { strict: true },
      include: ['src/**/*'],
    }, null, 2));

    const before = fs.readFileSync(tsconfigPath, 'utf-8');
    const result = runCli('interfaces build --lang py', { cwd: testDir });
    assert.ok(result.success, `command failed:\n${result.output}`);
    const after = fs.readFileSync(tsconfigPath, 'utf-8');
    assert.strictEqual(before, after, 'tsconfig.json must not be touched in py mode');
  });

  it('produces a structurally valid Python module for --lang py', () => {
    const result = runCli('interfaces build --lang py', { cwd: testDir });
    assert.ok(result.success, `command failed:\n${result.output}`);

    const generated = path.join(testDir, 'types', 'qelos_blueprints.py');
    const content = fs.readFileSync(generated, 'utf-8');

    // If python is available on PATH, prefer ast.parse (the gold-standard validity check).
    // On Windows, `python`/`python3` may resolve to an app-execution-alias stub that
    // exits with 9009 and prints "Python was not found"; treat that as missing.
    const pythonBins = ['python3', 'python'];
    let pyChecked = false;
    for (const bin of pythonBins) {
      const sniff = spawnSync(bin, ['-c', 'import sys; sys.stdout.write(sys.version)'], {
        encoding: 'utf8',
      });
      if (sniff.error || sniff.status !== 0 || !/^\d+\.\d+/.test(sniff.stdout || '')) continue;

      const probe = spawnSync(bin, ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'], {
        input: content,
        encoding: 'utf8',
      });
      pyChecked = true;
      assert.strictEqual(probe.status, 0, `python ast.parse rejected the module:\n${probe.stderr}`);
      break;
    }

    if (!pyChecked) {
      // Structural fallback: balanced parens/brackets, no tab indentation, every class
      // header followed by an indented body, no trailing whitespace artifacts.
      const lines = content.split('\n');
      assert.ok(lines.length > 5, 'expected a non-trivial module');
      assert.ok(!content.includes('\t'), 'python output must not use tab indentation');

      const counts = { '(': 0, ')': 0, '[': 0, ']': 0, '{': 0, '}': 0 };
      for (const ch of content) if (ch in counts) counts[ch]++;
      assert.strictEqual(counts['('], counts[')'], 'unbalanced parens');
      assert.strictEqual(counts['['], counts[']'], 'unbalanced brackets');
      assert.strictEqual(counts['{'], counts['}'], 'unbalanced braces');

      for (let i = 0; i < lines.length; i++) {
        if (/^class\s+\w+/.test(lines[i])) {
          assert.match(lines[i], /:\s*$/, `class header missing colon: ${lines[i]}`);
          const next = lines[i + 1] || '';
          assert.ok(/^\s{4}\S/.test(next), `class body must be indented: "${lines[i]}" → "${next}"`);
        }
      }
    }
  });
});
