const { describe, it } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

/**
 * `qelos agent` streaming: the real controller code and the real SDK, with a fake `fetch` that streams the AI
 * service's events. Each case runs in its own process so the terminal output can be read as it was printed.
 */
const cli = path.join(__dirname, '..', '..');

function run(...turns) {
  const script = `
    import QelosSDK from '@qelos/sdk';
    import { streamWithTools } from './controllers/agent.mjs';
    const turns = ${JSON.stringify(turns)};
    let turn = 0;
    const fetchImpl = async () => new Response(turns[turn++].map((e) => 'data: ' + JSON.stringify(e) + '\\n\\n').join(''), { headers: { 'content-type': 'text/event-stream' } });
    const sdk = new (QelosSDK.default ?? QelosSDK)({ appUrl: 'http://qelos.test', fetch: fetchImpl, apiToken: 't' });
    const tools = [{ name: 'now', handler: async () => 'noon' }];
    const saved = [];
    const result = await streamWithTools(sdk, 'agent-1', undefined, { messages: [{ role: 'user', content: 'hi' }] }, tools, false, 0, (m) => saved.push(m));
    process.stderr.write('\\nRESULT ' + JSON.stringify({ result, saved: saved.at(-1) }) + '\\n');
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { cwd: cli, encoding: 'utf8', timeout: 30_000, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
  assert.strictEqual(child.status, 0, child.stderr);
  const marker = child.stderr.lastIndexOf('RESULT ');
  const plain = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');
  return { out: plain(child.stdout), err: plain(child.stderr.slice(0, marker)), ...JSON.parse(child.stderr.slice(marker + 7)) };
}

const count = (text, part) => text.split(part).length - 1;

describe('qelos agent: streamed answers', () => {
  it('prints chunks and returns the answer', () => {
    const { out, err, result } = run([{ type: 'chunk', content: 'Hello ' }, { type: 'chunk', content: 'there' }, { type: 'done' }]);
    assert.match(out, /Assistant: .*Hello there/s);
    assert.strictEqual(result.fullResponse, 'Hello there');
    assert.strictEqual(result.error, undefined);
    assert.strictEqual(err.trim(), '');
  });

  it('shows an answer that arrives as one full_content event', () => {
    const { out, result, saved } = run([{ type: 'full_content', content: 'The whole answer' }, { type: 'done' }]);
    assert.match(out, /The whole answer/);
    assert.strictEqual(result.fullResponse, 'The whole answer');
    assert.strictEqual(saved.at(-1).content, 'The whole answer');
  });

  it('prints only what is missing when full_content completes the streamed text', () => {
    const { out, result } = run([{ type: 'chunk', content: 'The whole ' }, { type: 'full_content', content: 'The whole answer' }, { type: 'done' }]);
    assert.strictEqual(count(out, 'The whole'), 1);
    assert.match(out, /answer/);
    assert.strictEqual(result.fullResponse, 'The whole answer');
  });

  it('prints the full message again when it differs from what was streamed', () => {
    const { out, result } = run([{ type: 'chunk', content: 'draft text' }, { type: 'full_content', content: 'Final answer' }, { type: 'done' }]);
    assert.match(out, /draft text[\s\S]*Final answer/);
    assert.strictEqual(result.fullResponse, 'Final answer');
  });

  it('prints an error the service reports and returns it', () => {
    const { err, result } = run([{ type: 'error', error: 'AI chat completion failed', message: 'model overloaded' }]);
    assert.match(err, /Error: model overloaded/);
    assert.strictEqual(result.error, 'model overloaded');
    assert.strictEqual(result.fullResponse, '');
  });

  it('keeps and saves the text around an error', () => {
    const { err, result, saved } = run([
      { type: 'chunk', content: 'Checking. ' },
      { type: 'error', message: 'tool timed out' },
      { type: 'followup_chunk', content: 'Here is what I know.' },
      { type: 'done' },
    ]);
    assert.strictEqual(count(err, 'tool timed out'), 1);
    assert.strictEqual(result.fullResponse, 'Checking. Here is what I know.');
    assert.strictEqual(saved.at(-1).content, 'Checking. Here is what I know.');
  });

  it('says something went wrong for an error without a message', () => {
    const { err, result } = run([{ type: 'error' }]);
    assert.match(err, /Something went wrong/);
    assert.strictEqual(result.error, 'Something went wrong');
  });

  it('reports an error from the turn after a client tool ran', () => {
    const call = { id: 'c1', type: 'function', function: { name: 'now', arguments: '{}' } };
    const { err, result } = run(
      [{ type: 'function_calls_detected' }, { type: 'client_tool_calls', functionCalls: [call], backendResults: [], assistantToolCalls: [call] }, { type: 'done' }],
      [{ type: 'error', message: 'failed after the tool' }],
    );
    assert.match(err, /failed after the tool/);
    assert.strictEqual(result.error, 'failed after the tool');
  });
});
