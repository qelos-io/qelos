const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { execFile } = require('node:child_process');
const { createServer } = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** The real `qelos agent` command against a fake Qelos: a script has to learn from the exit code that it failed. */
const cli = path.join(__dirname, '..', '..', 'cli.mjs');
const agent = '0123456789abcdef01234567';

describe('qelos agent --stream exit status', () => {
  let server;
  let url;
  let events = [];
  const requests = [];
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qelos-cli-agent-'));

  before(async () => {
    server = createServer((req, res) => {
      req.resume();
      req.on('end', () => {
        requests.push(`${req.method} ${req.url.split('?')[0]}`);
        if (req.url.includes('/chat-completion')) {
          res.setHeader('content-type', 'text/event-stream');
          return res.end(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''));
        }
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ _id: 'u1', email: 'dev@example.com' }));
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(home, { recursive: true, force: true });
  });

  // asynchronous: the fake server lives in this process
  const run = () =>
    new Promise((resolve) => {
      execFile(
        process.execPath,
        [cli, 'agent', agent, '--stream', '--message', 'hi'],
        // an empty home and working folder, so no stored credentials or project config are read
        { cwd: home, env: { PATH: process.env.PATH, HOME: home, QELOS_URL: url, QELOS_API_TOKEN: 'test-token', NO_COLOR: '1', FORCE_COLOR: '0' }, timeout: 30_000 },
        (error, stdout, stderr) => resolve({ code: error ? error.code : 0, stdout, stderr }),
      );
    });

  it('exits 0 after an answer', async () => {
    events = [{ type: 'chunk', content: 'All good' }, { type: 'done' }];
    const result = await run();
    assert.strictEqual(result.code, 0, result.stderr);
    assert.match(result.stdout, /All good/);
    assert.ok(requests.some((r) => r.includes('/chat-completion')));
  });

  it('exits 1 and prints the reason when the service reports an error', async () => {
    events = [{ type: 'error', message: 'model overloaded' }];
    const result = await run();
    assert.strictEqual(result.code, 1);
    assert.match(result.stderr, /model overloaded/);
  });
});
