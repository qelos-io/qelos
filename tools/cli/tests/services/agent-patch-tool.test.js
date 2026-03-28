const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// ─── Mirror the patch handler logic from services/agent/tools.mjs ────────────
// We replicate the core logic here so the test file stays CJS-compatible
// without needing ESM loaders. Any change to the source handler MUST be
// reflected here.

/**
 * Pure-logic implementation of the patch tool (no stdout side-effects).
 * Returns { ok: true, message } on success or { ok: false, error, ... } on failure.
 */
function applyPatch(filePath, search, replace) {
  if (typeof search !== 'string' || !search) {
    return { ok: false, error: "patch: 'search' must be a non-empty string" };
  }
  if (typeof replace !== 'string') {
    return { ok: false, error: "patch: 'replace' must be a string" };
  }

  if (!fs.existsSync(filePath)) {
    return { ok: false, error: `File not found: ${filePath}` };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const idx = content.indexOf(search);

  if (idx === -1) {
    const lines = content.split('\n');
    const preview =
      lines.length <= 20
        ? content
        : lines.slice(0, 10).join('\n') +
          `\n... (${lines.length - 20} lines omitted) ...\n` +
          lines.slice(-10).join('\n');
    return {
      ok: false,
      error:
        'Search string not found in file. Make sure it matches exactly, including whitespace and indentation.',
      file_preview: preview,
    };
  }

  const secondIdx = content.indexOf(search, idx + 1);
  if (secondIdx !== -1) {
    return {
      ok: false,
      error:
        `Search string matches multiple locations in the file (at least positions ${idx} and ${secondIdx}). ` +
        'Include more surrounding context in the search string to make it unique.',
    };
  }

  const updated = content.slice(0, idx) + replace + content.slice(idx + search.length);
  fs.writeFileSync(filePath, updated, 'utf-8');

  const searchLines = search.split('\n').length;
  const replaceLines = replace.split('\n').length;
  return {
    ok: true,
    message: `Successfully patched ${filePath}: replaced ${searchLines} line(s) with ${replaceLines} line(s).`,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let tmpDir;

function setup() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patch-test-'));
}

function teardown() {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function writeFixture(name, content) {
  const filePath = path.join(tmpDir, name);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function readFixture(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('patch tool – core behaviour', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('replaces a single-line match', () => {
    const fp = writeFixture('hello.txt', 'hello world\n');
    const res = applyPatch(fp, 'hello world', 'goodbye world');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'goodbye world\n');
  });

  it('replaces a multi-line block', () => {
    const original = 'line1\nline2\nline3\nline4\n';
    const fp = writeFixture('multi.txt', original);
    const res = applyPatch(fp, 'line2\nline3', 'replaced2\nreplaced3\nreplaced3b');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'line1\nreplaced2\nreplaced3\nreplaced3b\nline4\n');
  });

  it('deletes matched block when replace is empty string', () => {
    const fp = writeFixture('del.txt', 'keep\nremove-me\nkeep2\n');
    const res = applyPatch(fp, 'remove-me\n', '');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'keep\nkeep2\n');
  });

  it('returns error when search string is not found', () => {
    const fp = writeFixture('miss.txt', 'aaa\nbbb\n');
    const res = applyPatch(fp, 'zzz', 'yyy');
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /not found/i);
    assert.ok(res.file_preview);
  });

  it('returns error when search matches multiple locations', () => {
    const fp = writeFixture('dup.txt', 'foo\nbar\nfoo\n');
    const res = applyPatch(fp, 'foo', 'baz');
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /multiple locations/i);
  });

  it('returns error for missing file', () => {
    const res = applyPatch(path.join(tmpDir, 'nope.txt'), 'a', 'b');
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /not found/i);
  });

  it('returns error when search is empty', () => {
    const fp = writeFixture('e.txt', 'content');
    const res = applyPatch(fp, '', 'x');
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /non-empty/i);
  });

  it('returns error when replace is not a string', () => {
    const fp = writeFixture('e2.txt', 'content');
    const res = applyPatch(fp, 'content', undefined);
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /must be a string/i);
  });

  it('preserves file when search is not found (no mutation)', () => {
    const original = 'do not touch\n';
    const fp = writeFixture('safe.txt', original);
    applyPatch(fp, 'missing', 'x');
    assert.strictEqual(readFixture(fp), original);
  });
});

// ─── Whitespace & indentation sensitivity ────────────────────────────────────

describe('patch tool – whitespace sensitivity', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('matches indentation with spaces exactly', () => {
    const fp = writeFixture('indent.txt', '    if (true) {\n        doSomething();\n    }\n');
    const res = applyPatch(fp, '        doSomething();', '        doSomethingElse();');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), '    if (true) {\n        doSomethingElse();\n    }\n');
  });

  it('matches tabs exactly', () => {
    const fp = writeFixture('tabs.txt', '\tfunction foo() {\n\t\treturn 1;\n\t}\n');
    const res = applyPatch(fp, '\t\treturn 1;', '\t\treturn 2;');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('\t\treturn 2;'));
  });

  it('fails when indentation does not match', () => {
    const fp = writeFixture('mismatch.txt', '    hello world\n');
    // search uses tabs instead of the file's 4-space indent — must NOT match
    const res = applyPatch(fp, '\thello world', 'bye');
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /not found/i);
  });

  it('handles trailing newline differences', () => {
    const fp = writeFixture('trail.txt', 'abc\n');
    const res = applyPatch(fp, 'abc\n', 'xyz\n');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'xyz\n');
  });

  it('handles CRLF line endings', () => {
    const fp = writeFixture('crlf.txt', 'line1\r\nline2\r\nline3\r\n');
    const res = applyPatch(fp, 'line2\r\n', 'replaced\r\n');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'line1\r\nreplaced\r\nline3\r\n');
  });
});

// ─── JavaScript files ────────────────────────────────────────────────────────

describe('patch tool – JavaScript files', () => {
  beforeEach(setup);
  afterEach(teardown);

  const JS_FILE = `
import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
`.trimStart();

  it('replaces a route handler', () => {
    const fp = writeFixture('app.js', JS_FILE);
    const res = applyPatch(
      fp,
      "app.get('/health', (req, res) => {\n  res.json({ status: 'ok' });\n});",
      "app.get('/health', (req, res) => {\n  res.json({ status: 'ok', uptime: process.uptime() });\n});"
    );
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('process.uptime()'));
  });

  it('replaces an import statement', () => {
    const fp = writeFixture('app2.js', JS_FILE);
    const res = applyPatch(fp, "import express from 'express';", "import express from 'express';\nimport cors from 'cors';");
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes("import cors from 'cors';"));
  });

  it('replaces a string literal', () => {
    const fp = writeFixture('app3.js', JS_FILE);
    const res = applyPatch(fp, "'Server running on port 3000'", "'Server started on port 8080'");
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('port 8080'));
  });
});

// ─── Python files ────────────────────────────────────────────────────────────

describe('patch tool – Python files', () => {
  beforeEach(setup);
  afterEach(teardown);

  const PY_FILE = `
import os
from pathlib import Path

def process_data(items):
    results = []
    for item in items:
        if item.is_valid():
            results.append(item.transform())
    return results

class DataProcessor:
    def __init__(self, config):
        self.config = config
        self.logger = None

    def run(self):
        data = self.load()
        return process_data(data)
`.trimStart();

  it('replaces a function body', () => {
    const fp = writeFixture('main.py', PY_FILE);
    const res = applyPatch(
      fp,
      '    results = []\n    for item in items:\n        if item.is_valid():\n            results.append(item.transform())\n    return results',
      '    return [item.transform() for item in items if item.is_valid()]'
    );
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('return [item.transform()'));
    assert.ok(!readFixture(fp).includes('results = []'));
  });

  it('replaces a class attribute', () => {
    const fp = writeFixture('main2.py', PY_FILE);
    const res = applyPatch(fp, '        self.logger = None', '        self.logger = logging.getLogger(__name__)');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('logging.getLogger'));
  });

  it('replaces an import statement', () => {
    const fp = writeFixture('main3.py', PY_FILE);
    const res = applyPatch(fp, 'from pathlib import Path', 'from pathlib import Path, PurePath');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('PurePath'));
  });
});

// ─── Go files ────────────────────────────────────────────────────────────────

describe('patch tool – Go files', () => {
  beforeEach(setup);
  afterEach(teardown);

  const GO_FILE = `package main

import (
\t"fmt"
\t"net/http"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
\tw.WriteHeader(http.StatusOK)
\tfmt.Fprintf(w, "ok")
}

func main() {
\thttp.HandleFunc("/health", healthHandler)
\thttp.ListenAndServe(":8080", nil)
}
`;

  it('replaces a function body with tabs', () => {
    const fp = writeFixture('main.go', GO_FILE);
    const res = applyPatch(
      fp,
      '\tw.WriteHeader(http.StatusOK)\n\tfmt.Fprintf(w, "ok")',
      '\tw.Header().Set("Content-Type", "application/json")\n\tw.WriteHeader(http.StatusOK)\n\tfmt.Fprintf(w, `{"status":"ok"}`)'
    );
    assert.strictEqual(res.ok, true);
    const result = readFixture(fp);
    assert.ok(result.includes('Content-Type'));
    assert.ok(result.includes('application/json'));
  });

  it('adds an import', () => {
    const fp = writeFixture('main2.go', GO_FILE);
    const res = applyPatch(
      fp,
      'import (\n\t"fmt"\n\t"net/http"\n)',
      'import (\n\t"encoding/json"\n\t"fmt"\n\t"net/http"\n)'
    );
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('"encoding/json"'));
  });

  it('replaces the listen address', () => {
    const fp = writeFixture('main3.go', GO_FILE);
    const res = applyPatch(fp, '":8080"', '":9090"');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes(':9090'));
  });
});

// ─── YAML files ──────────────────────────────────────────────────────────────

describe('patch tool – YAML files', () => {
  beforeEach(setup);
  afterEach(teardown);

  const YAML_FILE = `name: my-app
version: "1.0.0"

services:
  web:
    image: node:18
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production

  db:
    image: postgres:15
    ports:
      - "5432:5432"
`;

  it('replaces a YAML value', () => {
    const fp = writeFixture('docker-compose.yml', YAML_FILE);
    const res = applyPatch(fp, 'image: node:18', 'image: node:20');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('node:20'));
    assert.ok(!readFixture(fp).includes('node:18'));
  });

  it('replaces a nested block', () => {
    const fp = writeFixture('compose2.yml', YAML_FILE);
    const res = applyPatch(
      fp,
      '    environment:\n      NODE_ENV: production',
      '    environment:\n      NODE_ENV: production\n      PORT: "3000"'
    );
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('PORT: "3000"'));
  });

  it('replaces a port mapping', () => {
    const fp = writeFixture('compose3.yml', YAML_FILE);
    const res = applyPatch(fp, '      - "3000:3000"', '      - "8080:3000"');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('8080:3000'));
  });

  it('replaces a top-level key', () => {
    const fp = writeFixture('compose4.yml', YAML_FILE);
    const res = applyPatch(fp, 'version: "1.0.0"', 'version: "2.0.0"');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('"2.0.0"'));
  });
});

// ─── JSON files ──────────────────────────────────────────────────────────────

describe('patch tool – JSON files', () => {
  beforeEach(setup);
  afterEach(teardown);

  const JSON_FILE = `{
  "name": "my-package",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "lodash": "^4.17.21"
  },
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  }
}
`;

  it('replaces a dependency version', () => {
    const fp = writeFixture('package.json', JSON_FILE);
    const res = applyPatch(fp, '"express": "^4.18.0"', '"express": "^5.0.0"');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('"express": "^5.0.0"'));
  });

  it('adds a new dependency', () => {
    const fp = writeFixture('pkg2.json', JSON_FILE);
    const res = applyPatch(
      fp,
      '    "lodash": "^4.17.21"',
      '    "lodash": "^4.17.21",\n    "axios": "^1.6.0"'
    );
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('"axios": "^1.6.0"'));
  });

  it('replaces a script', () => {
    const fp = writeFixture('pkg3.json', JSON_FILE);
    const res = applyPatch(fp, '"test": "jest"', '"test": "vitest"');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('"test": "vitest"'));
  });
});

// ─── Dockerfile ──────────────────────────────────────────────────────────────

describe('patch tool – Dockerfile', () => {
  beforeEach(setup);
  afterEach(teardown);

  const DOCKERFILE = `FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
`;

  it('replaces the base image', () => {
    const fp = writeFixture('Dockerfile', DOCKERFILE);
    const res = applyPatch(fp, 'FROM node:18-alpine AS builder', 'FROM node:20-alpine AS builder');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('node:20-alpine AS builder'));
  });

  it('replaces the CMD instruction', () => {
    const fp = writeFixture('Dockerfile2', DOCKERFILE);
    const res = applyPatch(fp, 'CMD ["node", "dist/index.js"]', 'CMD ["node", "dist/server.js"]');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('dist/server.js'));
  });
});

// ─── TypeScript files ────────────────────────────────────────────────────────

describe('patch tool – TypeScript files', () => {
  beforeEach(setup);
  afterEach(teardown);

  const TS_FILE = `interface Config {
  port: number;
  host: string;
  debug: boolean;
}

function createServer(config: Config): void {
  const { port, host } = config;
  console.log(\`Listening on \${host}:\${port}\`);
}

export default createServer;
`;

  it('adds a field to an interface', () => {
    const fp = writeFixture('config.ts', TS_FILE);
    const res = applyPatch(
      fp,
      '  debug: boolean;\n}',
      '  debug: boolean;\n  timeout: number;\n}'
    );
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('timeout: number;'));
  });

  it('replaces a function signature', () => {
    const fp = writeFixture('config2.ts', TS_FILE);
    const res = applyPatch(
      fp,
      'function createServer(config: Config): void {',
      'async function createServer(config: Config): Promise<void> {'
    );
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('async function'));
    assert.ok(readFixture(fp).includes('Promise<void>'));
  });
});

// ─── SQL files ───────────────────────────────────────────────────────────────

describe('patch tool – SQL files', () => {
  beforeEach(setup);
  afterEach(teardown);

  const SQL_FILE = `CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
`;

  it('adds a column', () => {
    const fp = writeFixture('schema.sql', SQL_FILE);
    const res = applyPatch(
      fp,
      '    created_at TIMESTAMP DEFAULT NOW()',
      '    created_at TIMESTAMP DEFAULT NOW(),\n    updated_at TIMESTAMP DEFAULT NOW()'
    );
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('updated_at'));
  });

  it('changes a column type', () => {
    const fp = writeFixture('schema2.sql', SQL_FILE);
    const res = applyPatch(fp, 'VARCHAR(100)', 'VARCHAR(255) NOT NULL');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('name VARCHAR(255) NOT NULL'));
  });
});

// ─── Shell / Bash scripts ────────────────────────────────────────────────────

describe('patch tool – Shell scripts', () => {
  beforeEach(setup);
  afterEach(teardown);

  const SH_FILE = `#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/var/log/myapp"
MAX_RETRIES=3

function deploy() {
  echo "Deploying..."
  npm run build
  rsync -avz dist/ server:/app/
}

deploy
`;

  it('replaces a variable value', () => {
    const fp = writeFixture('deploy.sh', SH_FILE);
    const res = applyPatch(fp, 'MAX_RETRIES=3', 'MAX_RETRIES=5');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('MAX_RETRIES=5'));
  });

  it('replaces a function body', () => {
    const fp = writeFixture('deploy2.sh', SH_FILE);
    const res = applyPatch(
      fp,
      '  echo "Deploying..."\n  npm run build\n  rsync -avz dist/ server:/app/',
      '  echo "Deploying to production..."\n  npm run build\n  docker push myapp:latest'
    );
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('docker push'));
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('patch tool – edge cases', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('handles empty file', () => {
    const fp = writeFixture('empty.txt', '');
    const res = applyPatch(fp, 'anything', 'replacement');
    assert.strictEqual(res.ok, false);
    assert.match(res.error, /not found/i);
  });

  it('replaces the entire file content', () => {
    const fp = writeFixture('all.txt', 'old content');
    const res = applyPatch(fp, 'old content', 'new content');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'new content');
  });

  it('handles special regex characters in search (literal match)', () => {
    const fp = writeFixture('regex.txt', 'price is $100.00 (USD)\n');
    const res = applyPatch(fp, '$100.00 (USD)', '$200.00 (EUR)');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('$200.00 (EUR)'));
  });

  it('handles unicode content', () => {
    const fp = writeFixture('unicode.txt', '# 日本語テスト\nこんにちは世界\n');
    const res = applyPatch(fp, 'こんにちは世界', 'さようなら世界');
    assert.strictEqual(res.ok, true);
    assert.ok(readFixture(fp).includes('さようなら世界'));
  });

  it('handles very long lines', () => {
    const longLine = 'x'.repeat(10000);
    const fp = writeFixture('long.txt', `before\n${longLine}\nafter\n`);
    const res = applyPatch(fp, longLine, 'short');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'before\nshort\nafter\n');
  });

  it('handles search at very start of file', () => {
    const fp = writeFixture('start.txt', 'first line\nsecond line\n');
    const res = applyPatch(fp, 'first line', 'new first line');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'new first line\nsecond line\n');
  });

  it('handles search at very end of file', () => {
    const fp = writeFixture('end.txt', 'first line\nlast line');
    const res = applyPatch(fp, 'last line', 'new last line');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'first line\nnew last line');
  });

  it('preserves binary-like content around the patch', () => {
    const content = 'normal\x00binary\x01data\npatched line\nmore\x00stuff\n';
    const fp = writeFixture('bin.txt', content);
    const res = applyPatch(fp, 'patched line', 'replaced line');
    assert.strictEqual(res.ok, true);
    const result = readFixture(fp);
    assert.ok(result.includes('replaced line'));
    assert.ok(result.includes('\x00binary\x01data'));
  });

  it('provides file preview on search miss (large file)', () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`);
    const fp = writeFixture('large.txt', lines.join('\n') + '\n');
    const res = applyPatch(fp, 'not in file', 'x');
    assert.strictEqual(res.ok, false);
    assert.ok(res.file_preview);
    // Preview should contain first and last lines but omit the middle
    assert.ok(res.file_preview.includes('line 1'));
    assert.ok(res.file_preview.includes('line 50'));
    assert.ok(res.file_preview.includes('lines omitted'));
  });

  it('handles replace with same content (no-op)', () => {
    const fp = writeFixture('noop.txt', 'unchanged\n');
    const res = applyPatch(fp, 'unchanged', 'unchanged');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'unchanged\n');
  });

  it('handles multi-byte characters at patch boundary', () => {
    const fp = writeFixture('emoji.txt', 'before 🚀 middle 🎉 after\n');
    const res = applyPatch(fp, '🚀 middle 🎉', '✅ replaced ✅');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'before ✅ replaced ✅ after\n');
  });

  it('handles nested braces and brackets', () => {
    const content = 'const x = { a: [1, {b: 2}], c: {d: [3]} };\n';
    const fp = writeFixture('nested.js', content);
    const res = applyPatch(fp, '{ a: [1, {b: 2}], c: {d: [3]} }', '{ a: [1, 2, 3] }');
    assert.strictEqual(res.ok, true);
    assert.strictEqual(readFixture(fp), 'const x = { a: [1, 2, 3] };\n');
  });
});
