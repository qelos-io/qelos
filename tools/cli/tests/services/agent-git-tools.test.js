const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

// ─── Mirror git tool handler logic from services/agent/tools.mjs ─────────────
// We replicate the core logic here so the test file stays CJS-compatible
// without needing ESM loaders. Any change to the source handler MUST be
// reflected here.

const EXEC_OPTS = () => ({
  encoding: 'utf-8',
  cwd: tmpDir,
  stdio: ['pipe', 'pipe', 'pipe'],
});

// ─── git_status ──────────────────────────────────────────────────────────────

function gitStatus() {
  try {
    const opts = EXEC_OPTS();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', opts).trim();

    const porcelain = execSync('git status --porcelain', opts);

    const staged = [];
    const modified = [];
    const untracked = [];

    for (const line of porcelain.split('\n')) {
      if (!line) continue;
      const index = line[0];
      const worktree = line[1];
      const file = line.slice(3);

      if (index === '?') {
        untracked.push(file);
      } else {
        if (index !== ' ' && index !== '?') staged.push({ status: index, file });
        if (worktree !== ' ' && worktree !== '?') modified.push({ status: worktree, file });
      }
    }

    return { branch, staged, modified, untracked };
  } catch (err) {
    return { error: err.stderr?.toString() || err.message };
  }
}

// ─── git_diff ────────────────────────────────────────────────────────────────

function gitDiff(args = {}) {
  try {
    const parts = ['git', 'diff'];
    if (args.base) {
      parts.push(args.base);
    } else if (args.staged) {
      parts.push('--cached');
    }
    if (args.stat) parts.push('--stat');
    if (args.file) parts.push('--', args.file);

    const result = execSync(parts.join(' '), EXEC_OPTS());
    return result || '(no changes)';
  } catch (err) {
    return JSON.stringify({ error: err.stderr?.toString() || err.message });
  }
}

// ─── git_commit ──────────────────────────────────────────────────────────────

function gitCommit(args) {
  if (typeof args.message !== 'string' || !args.message.trim()) {
    return { error: "git_commit: 'message' is required" };
  }
  try {
    const opts = EXEC_OPTS();

    if (Array.isArray(args.files) && args.files.length > 0) {
      const filesToAdd = args.files.map(f => `"${f}"`).join(' ');
      execSync(`git add ${filesToAdd}`, opts);
    }

    const result = execSync(`git commit -m ${JSON.stringify(args.message)}`, opts);
    return result || '(committed)';
  } catch (err) {
    const stderr = err.stderr?.toString() || '';
    const stdout = err.stdout?.toString() || '';
    return stdout + (stderr ? `\n${stderr}` : '') || { error: err.message };
  }
}

// ─── git_log ─────────────────────────────────────────────────────────────────

function gitLog(args = {}) {
  try {
    const n = args.count || 10;
    const opts = EXEC_OPTS();

    if (args.oneline) {
      const parts = ['git', 'log', '--oneline', '-n', `${n}`];
      if (args.file) parts.push('--', args.file);
      const result = execSync(parts.join(' '), opts);
      return result || '(no commits)';
    }

    const SEP = '---GIT_LOG_SEP---';
    const format = `--format=${SEP}%n%H%n%an%n%aI%n%s`;
    const parts = ['git', 'log', format, '-n', `${n}`];
    if (args.file) parts.push('--', args.file);

    const raw = execSync(parts.join(' '), opts);
    const entries = raw.split(SEP).filter(Boolean).map(block => {
      const lines = block.trim().split('\n');
      return { sha: lines[0], author: lines[1], date: lines[2], message: lines.slice(3).join('\n') };
    });

    return entries;
  } catch (err) {
    return { error: err.stderr?.toString() || err.message };
  }
}

// ─── git_diff_files ──────────────────────────────────────────────────────────

function gitDiffFiles(args = {}) {
  try {
    const parts = ['git', 'diff', '--name-status'];
    if (args.base) {
      parts.push(args.base);
    } else if (args.staged) {
      parts.push('--cached');
    }

    const raw = execSync(parts.join(' '), EXEC_OPTS());

    const files = raw.split('\n').filter(Boolean).map(line => {
      const [status, ...rest] = line.split('\t');
      return { status: status.trim(), file: rest.join('\t').trim() };
    });

    return files;
  } catch (err) {
    return { error: err.stderr?.toString() || err.message };
  }
}

// ─── git_show ────────────────────────────────────────────────────────────────

function gitShow(args = {}) {
  try {
    const ref = args.ref || 'HEAD';
    const parts = ['git', 'show', ref];
    if (args.stat) parts.push('--stat');

    const result = execSync(parts.join(' '), EXEC_OPTS());
    return result || '(empty)';
  } catch (err) {
    return { error: err.stderr?.toString() || err.message };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-tools-test-'));
  const opts = { cwd: tmpDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] };
  execSync('git init', opts);
  execSync('git config user.email "test@test.com"', opts);
  execSync('git config user.name "Test User"', opts);
  // Create initial commit so we have a valid HEAD
  fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Test\n', 'utf-8');
  execSync('git add README.md', opts);
  execSync('git commit -m "initial commit"', opts);
}

function teardown() {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function writeFile(name, content) {
  const filePath = path.join(tmpDir, name);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function gitExec(cmd) {
  return execSync(cmd, { cwd: tmpDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('git_status', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('returns branch name and clean status', () => {
    const result = gitStatus();
    assert.ok(result.branch, 'should have a branch name');
    assert.deepStrictEqual(result.staged, []);
    assert.deepStrictEqual(result.modified, []);
    assert.deepStrictEqual(result.untracked, []);
  });

  it('detects untracked files', () => {
    writeFile('new-file.txt', 'hello\n');
    const result = gitStatus();
    assert.deepStrictEqual(result.untracked, ['new-file.txt']);
  });

  it('detects staged files', () => {
    writeFile('staged.txt', 'content\n');
    gitExec('git add staged.txt');
    const result = gitStatus();
    assert.strictEqual(result.staged.length, 1);
    assert.strictEqual(result.staged[0].file, 'staged.txt');
    assert.strictEqual(result.staged[0].status, 'A');
  });

  it('detects modified (unstaged) files', () => {
    writeFile('README.md', '# Updated\n');
    const result = gitStatus();
    assert.strictEqual(result.modified.length, 1);
    assert.strictEqual(result.modified[0].file, 'README.md');
    assert.strictEqual(result.modified[0].status, 'M');
  });

  it('detects both staged and unstaged changes simultaneously', () => {
    writeFile('a.txt', 'content a\n');
    gitExec('git add a.txt');
    writeFile('README.md', '# Modified\n');
    const result = gitStatus();
    assert.strictEqual(result.staged.length, 1);
    assert.strictEqual(result.staged[0].file, 'a.txt');
    assert.strictEqual(result.modified.length, 1);
    assert.strictEqual(result.modified[0].file, 'README.md');
  });

  it('detects deleted files', () => {
    fs.unlinkSync(path.join(tmpDir, 'README.md'));
    const result = gitStatus();
    assert.strictEqual(result.modified.length, 1);
    assert.strictEqual(result.modified[0].status, 'D');
    assert.strictEqual(result.modified[0].file, 'README.md');
  });

  it('handles multiple untracked files', () => {
    writeFile('a.txt', 'a\n');
    writeFile('b.txt', 'b\n');
    writeFile('c.txt', 'c\n');
    const result = gitStatus();
    assert.strictEqual(result.untracked.length, 3);
    assert.ok(result.untracked.includes('a.txt'));
    assert.ok(result.untracked.includes('b.txt'));
    assert.ok(result.untracked.includes('c.txt'));
  });
});

describe('git_diff', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('returns "(no changes)" when working tree is clean', () => {
    const result = gitDiff();
    assert.strictEqual(result, '(no changes)');
  });

  it('shows unstaged changes by default', () => {
    writeFile('README.md', '# Updated content\n');
    const result = gitDiff();
    assert.ok(result.includes('Updated content'), 'should contain the changed text');
    assert.ok(result.includes('diff --git'), 'should contain diff header');
  });

  it('shows staged changes with staged=true', () => {
    writeFile('README.md', '# Staged update\n');
    gitExec('git add README.md');
    const result = gitDiff({ staged: true });
    assert.ok(result.includes('Staged update'), 'should show staged changes');
  });

  it('returns "(no changes)" for staged when no staged changes', () => {
    writeFile('README.md', '# Unstaged only\n');
    const result = gitDiff({ staged: true });
    assert.strictEqual(result, '(no changes)');
  });

  it('filters diff to a specific file', () => {
    writeFile('README.md', '# Changed\n');
    writeFile('other.txt', 'other\n');
    gitExec('git add other.txt');
    gitExec('git commit -m "add other"');
    writeFile('other.txt', 'changed other\n');
    writeFile('README.md', '# Also changed\n');

    const result = gitDiff({ file: 'other.txt' });
    assert.ok(result.includes('other.txt'), 'should mention the filtered file');
    assert.ok(!result.includes('README.md'), 'should not include other files');
  });

  it('returns stat summary with stat=true', () => {
    writeFile('README.md', '# Lots of changes\nline1\nline2\nline3\n');
    const result = gitDiff({ stat: true });
    assert.ok(result.includes('README.md'), 'stat should mention file name');
    assert.ok(result.includes('|'), 'stat output should include pipe separator');
  });

  it('diffs against a base ref', () => {
    writeFile('new-file.txt', 'initial\n');
    gitExec('git add new-file.txt');
    gitExec('git commit -m "add new file"');
    writeFile('new-file.txt', 'updated\n');
    gitExec('git add new-file.txt');
    gitExec('git commit -m "update file"');

    const result = gitDiff({ base: 'HEAD~1' });
    assert.ok(result.includes('updated'), 'should show diff against base ref');
  });
});

describe('git_commit', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('rejects missing message', () => {
    const result = gitCommit({ message: '' });
    assert.ok(result.error, 'should return error for empty message');
  });

  it('commits already-staged changes', () => {
    writeFile('staged.txt', 'content\n');
    gitExec('git add staged.txt');
    const result = gitCommit({ message: 'add staged file' });
    assert.ok(typeof result === 'string', 'should return commit output string');
    assert.ok(result.includes('add staged file'), 'output should include commit message');

    // Verify commit happened
    const log = gitExec('git log --oneline -1');
    assert.ok(log.includes('add staged file'));
  });

  it('stages and commits specified files', () => {
    writeFile('a.txt', 'a content\n');
    writeFile('b.txt', 'b content\n');
    const result = gitCommit({ message: 'add two files', files: ['a.txt', 'b.txt'] });
    assert.ok(typeof result === 'string');

    const log = gitExec('git log --oneline -1');
    assert.ok(log.includes('add two files'));

    // Both files should be committed
    const status = gitStatus();
    assert.deepStrictEqual(status.untracked, []);
  });

  it('stages only specified files, leaving others unstaged', () => {
    writeFile('commit-me.txt', 'yes\n');
    writeFile('leave-me.txt', 'no\n');
    gitCommit({ message: 'partial commit', files: ['commit-me.txt'] });

    const status = gitStatus();
    assert.deepStrictEqual(status.untracked, ['leave-me.txt']);
  });

  it('returns error output when nothing to commit', () => {
    const result = gitCommit({ message: 'empty commit' });
    // git commit with nothing staged returns error
    assert.ok(typeof result === 'string' || result.error, 'should indicate nothing to commit');
  });
});

describe('git_log', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('returns structured entries with sha, author, date, message', () => {
    const entries = gitLog();
    assert.ok(Array.isArray(entries), 'should return an array');
    assert.strictEqual(entries.length, 1, 'should have the initial commit');

    const entry = entries[0];
    assert.ok(entry.sha, 'should have sha');
    assert.strictEqual(entry.sha.length, 40, 'sha should be 40 chars');
    assert.strictEqual(entry.author, 'Test User');
    assert.ok(entry.date, 'should have date');
    assert.strictEqual(entry.message, 'initial commit');
  });

  it('respects count parameter', () => {
    writeFile('a.txt', 'a\n');
    gitExec('git add a.txt');
    gitExec('git commit -m "second commit"');
    writeFile('b.txt', 'b\n');
    gitExec('git add b.txt');
    gitExec('git commit -m "third commit"');

    const entries = gitLog({ count: 2 });
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].message, 'third commit');
    assert.strictEqual(entries[1].message, 'second commit');
  });

  it('returns oneline format', () => {
    const result = gitLog({ oneline: true });
    assert.ok(typeof result === 'string', 'oneline should return a string');
    assert.ok(result.includes('initial commit'));
  });

  it('filters by file path', () => {
    writeFile('tracked.txt', 'content\n');
    gitExec('git add tracked.txt');
    gitExec('git commit -m "add tracked"');
    writeFile('other.txt', 'other\n');
    gitExec('git add other.txt');
    gitExec('git commit -m "add other"');

    const entries = gitLog({ file: 'tracked.txt' });
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].message, 'add tracked');
  });

  it('returns multiple commits in reverse chronological order', () => {
    for (let i = 1; i <= 5; i++) {
      writeFile(`file${i}.txt`, `${i}\n`);
      gitExec(`git add file${i}.txt`);
      gitExec(`git commit -m "commit ${i}"`);
    }

    const entries = gitLog({ count: 5 });
    assert.strictEqual(entries.length, 5);
    assert.strictEqual(entries[0].message, 'commit 5');
    assert.strictEqual(entries[4].message, 'commit 1');
  });
});

describe('git_diff_files', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('returns empty array when no changes', () => {
    const files = gitDiffFiles();
    assert.deepStrictEqual(files, []);
  });

  it('lists unstaged modified files', () => {
    writeFile('README.md', '# Changed\n');
    const files = gitDiffFiles();
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].status, 'M');
    assert.strictEqual(files[0].file, 'README.md');
  });

  it('lists staged files with staged=true', () => {
    writeFile('new.txt', 'content\n');
    gitExec('git add new.txt');
    const files = gitDiffFiles({ staged: true });
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].status, 'A');
    assert.strictEqual(files[0].file, 'new.txt');
  });

  it('lists files changed against a base ref', () => {
    writeFile('a.txt', 'content\n');
    gitExec('git add a.txt');
    gitExec('git commit -m "add a"');
    writeFile('b.txt', 'content\n');
    gitExec('git add b.txt');
    gitExec('git commit -m "add b"');

    const files = gitDiffFiles({ base: 'HEAD~2' });
    assert.strictEqual(files.length, 2);
    const fileNames = files.map(f => f.file).sort();
    assert.deepStrictEqual(fileNames, ['a.txt', 'b.txt']);
  });

  it('detects deleted files', () => {
    gitExec('git rm README.md');
    const files = gitDiffFiles({ staged: true });
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].status, 'D');
    assert.strictEqual(files[0].file, 'README.md');
  });

  it('lists multiple changed files', () => {
    writeFile('a.txt', 'a\n');
    writeFile('b.txt', 'b\n');
    writeFile('c.txt', 'c\n');
    gitExec('git add a.txt b.txt c.txt');
    const files = gitDiffFiles({ staged: true });
    assert.strictEqual(files.length, 3);
  });
});

describe('git_show', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('shows HEAD commit by default', () => {
    const result = gitShow();
    assert.ok(result.includes('initial commit'), 'should show commit message');
    assert.ok(result.includes('Test User'), 'should show author');
  });

  it('shows specific commit by SHA', () => {
    writeFile('a.txt', 'content\n');
    gitExec('git add a.txt');
    gitExec('git commit -m "second commit"');

    const log = gitLog({ count: 1 });
    const sha = log[0].sha;

    const result = gitShow({ ref: sha });
    assert.ok(result.includes('second commit'));
    assert.ok(result.includes('a.txt'));
  });

  it('shows stat summary with stat=true', () => {
    writeFile('stat-file.txt', 'some content\n');
    gitExec('git add stat-file.txt');
    gitExec('git commit -m "stat test"');

    const result = gitShow({ stat: true });
    assert.ok(result.includes('stat-file.txt'), 'stat should mention the file');
    assert.ok(result.includes('|'), 'stat should have pipe separator');
    // stat mode should NOT include the full patch
    assert.ok(!result.includes('+some content'), 'stat should not show full patch content');
  });

  it('shows diff of the commit', () => {
    writeFile('diff-file.txt', 'hello world\n');
    gitExec('git add diff-file.txt');
    gitExec('git commit -m "add diff file"');

    const result = gitShow();
    assert.ok(result.includes('diff --git'), 'should include diff header');
    assert.ok(result.includes('hello world'), 'should include file content');
  });

  it('returns error for invalid ref', () => {
    const result = gitShow({ ref: 'nonexistent-ref-abc123' });
    assert.ok(result.error, 'should return error for bad ref');
  });
});

describe('git tools – integration workflow', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('full workflow: create file, stage, commit, verify log', () => {
    // 1. Create a new file
    writeFile('feature.js', 'function hello() { return "world"; }\n');

    // 2. Check status – should show untracked
    let status = gitStatus();
    assert.ok(status.untracked.includes('feature.js'));

    // 3. Stage and commit
    gitCommit({ message: 'feat: add hello function', files: ['feature.js'] });

    // 4. Verify status is clean
    status = gitStatus();
    assert.deepStrictEqual(status.untracked, []);
    assert.deepStrictEqual(status.modified, []);
    assert.deepStrictEqual(status.staged, []);

    // 5. Verify log
    const entries = gitLog({ count: 1 });
    assert.strictEqual(entries[0].message, 'feat: add hello function');

    // 6. Verify show
    const show = gitShow();
    assert.ok(show.includes('feat: add hello function'));
    assert.ok(show.includes('hello'));
  });

  it('modify-diff-commit workflow', () => {
    // 1. Modify existing file
    writeFile('README.md', '# Updated Project\n\nNew description.\n');

    // 2. Check diff
    const diff = gitDiff();
    assert.ok(diff.includes('Updated Project'));

    // 3. Check diff_files
    const diffFiles = gitDiffFiles();
    assert.strictEqual(diffFiles.length, 1);
    assert.strictEqual(diffFiles[0].file, 'README.md');

    // 4. Stage and check staged diff
    gitExec('git add README.md');
    const stagedDiff = gitDiff({ staged: true });
    assert.ok(stagedDiff.includes('Updated Project'));

    // 5. Commit
    gitCommit({ message: 'docs: update readme' });

    // 6. Verify with show
    const show = gitShow({ stat: true });
    assert.ok(show.includes('README.md'));
  });

  it('multi-file branch workflow with base diff', () => {
    // Record initial HEAD
    const initialSha = gitLog({ count: 1 })[0].sha;

    // Create several commits
    writeFile('src/index.js', 'export default {};\n');
    gitCommit({ message: 'add index', files: ['src/index.js'] });

    writeFile('src/utils.js', 'export const add = (a, b) => a + b;\n');
    gitCommit({ message: 'add utils', files: ['src/utils.js'] });

    // Diff against initial commit
    const diffFiles = gitDiffFiles({ base: initialSha });
    assert.strictEqual(diffFiles.length, 2);
    const fileNames = diffFiles.map(f => f.file).sort();
    assert.deepStrictEqual(fileNames, ['src/index.js', 'src/utils.js']);

    // Full diff against base
    const diff = gitDiff({ base: initialSha });
    assert.ok(diff.includes('index.js'));
    assert.ok(diff.includes('utils.js'));

    // Log should show 3 commits total
    const allLog = gitLog({ count: 10 });
    assert.strictEqual(allLog.length, 3);
  });
});
