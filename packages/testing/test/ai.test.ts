import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSdk } from '../src/sdk/index.js';

const quiet = { logger: () => {}, sdkOptions: { apiToken: 'mock' }, seed: { aiResponses: [{ match: 'hello', content: 'Seeded hi' }] } };
const chat = (sdk: any, text: string, agent = 'agent1') => sdk.ai.agents.chat(agent, text);
const text = (res: any) => res.choices[0].message.content;

test('scripted replies beat seeded ones; string, regexp and function matchers', async () => {
  const { sdk, mock } = createMockSdk(quiet);
  assert.equal(text(await chat(sdk, 'hello')), 'Seeded hi');
  mock.ai.reply(/hel+o/i, 'Scripted hi');
  assert.equal(text(await chat(sdk, 'hello')), 'Scripted hi');
  mock.ai.reply((c) => c.agentId === 'special', 'for special');
  assert.equal(text(await chat(sdk, 'x', 'special')), 'for special');
  assert.equal(text(await chat(sdk, 'unknown')), 'Mock response: unknown');
});

test('sequences, times, agent filter and rule handles', async () => {
  const { sdk, mock } = createMockSdk(quiet);
  const seq = mock.ai.reply('*', ['one', 'two']);
  assert.deepEqual([text(await chat(sdk, 'a')), text(await chat(sdk, 'b')), text(await chat(sdk, 'c'))], ['one', 'two', 'two']);
  assert.equal(seq.calls, 3);
  seq.remove();
  mock.ai.reply('*', 'only once', { times: 1 });
  assert.equal(text(await chat(sdk, 'a')), 'only once');
  assert.equal(text(await chat(sdk, 'a')), 'Mock response: a');
  mock.ai.reply('*', 'agent2 only', { agent: 'agent2' });
  assert.equal(text(await chat(sdk, 'a', 'agent1')), 'Mock response: a');
  assert.equal(text(await chat(sdk, 'a', 'agent2')), 'agent2 only');
});

test('calls records what the app sent', async () => {
  const { sdk, mock } = createMockSdk(quiet);
  await chat(sdk, 'first question');
  assert.equal(mock.ai.calls.length, 1);
  assert.equal(mock.ai.calls[0].agentId, 'agent1');
  assert.equal(mock.ai.calls[0].message, 'first question');
  assert.equal(mock.ai.calls[0].stream, false);
});

test('tool calls, errors and chunks', async () => {
  const { sdk, mock } = createMockSdk(quiet);
  mock.ai.reply('weather', { toolCalls: [{ name: 'get_weather', arguments: { city: 'Paris' } }] });
  const res: any = await chat(sdk, 'weather?');
  assert.equal(res.choices[0].finish_reason, 'tool_calls');
  assert.equal(res.choices[0].message.tool_calls[0].function.name, 'get_weather');
  assert.deepEqual(JSON.parse(res.choices[0].message.tool_calls[0].function.arguments), { city: 'Paris' });

  mock.ai.fail('boom', 503, 'model overloaded');
  await assert.rejects(() => chat(sdk, 'boom'), /overloaded|503/);

  mock.ai.reply('stream me', { chunks: ['Hel', 'lo ', 'there'] });
  assert.equal(text(await chat(sdk, 'stream me')), 'Hello there');
  const stream = await mock.fetch('/api/ai/agent1/chat-completion?stream=true', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'stream me' }] }),
  });
  const events = (await stream.text()).split('\n\n').filter(Boolean).map((line) => JSON.parse(line.slice('data: '.length)));
  assert.deepEqual(events, [
    { type: 'chunk', content: 'Hel' },
    { type: 'chunk', content: 'lo ' },
    { type: 'chunk', content: 'there' },
    { type: 'done' },
  ]);
});

test('reset() clears scripted replies and recorded calls', async () => {
  const { sdk, mock, reset } = createMockSdk(quiet);
  mock.ai.reply('*', 'scripted');
  await chat(sdk, 'x');
  reset();
  assert.equal(mock.ai.calls.length, 0);
  assert.equal(text(await chat(sdk, 'x')), 'Mock response: x');
});
