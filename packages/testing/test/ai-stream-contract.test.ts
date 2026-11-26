import { describe, mock as testMock, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos } from '../src/index.js';
import type { AiReply } from '../src/ai/ai-stub.js';

/**
 * Contract between the mock and the real AI service: the same conversation is run through the service's own
 * streaming handler (`apps/ai`, with a fake model provider) and through the mock, and the events a client receives
 * must match. If the service changes its stream, this fails instead of apps passing their tests against the mock.
 */
const here = dirname(fileURLToPath(import.meta.url));
// computed so type-checking this package does not pull in the service's sources
const servicePath = join(here, '..', '..', '..', 'apps', 'ai', 'server', 'services', 'chat-completion-service');

type Event = Record<string, any>;
const parse = (body: string): Event[] =>
  body
    .split('\n\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)));

/** A model answer in the normalized form every provider adapter of the service produces. */
const text = (content: string) => ({ choices: [{ delta: { content } }] });
const toolCall = (id: string, name: string, args: string) => ({
  choices: [{ delta: { tool_calls: [{ id, type: 'function', function: { name, arguments: args } }] }, finish_reason: 'tool_calls' }],
});
const stop = () => ({ choices: [{ delta: {}, finish_reason: 'stop' }] });

async function realService(turns: Array<Array<unknown> | Error>, executeTools: (calls: any[], sendSSE: (e: Event) => void) => Promise<any[]> = async () => []) {
  const { handleStreamingChatCompletion } = await import(servicePath);
  let written = '';
  const res = {
    writableEnded: false,
    write: (chunk: string) => (written += chunk),
    end() {
      this.writableEnded = true;
    },
  };
  let turn = 0;
  const aiService = {
    async createChatCompletionStream() {
      const answer = turns[turn++] ?? [stop()];
      if (answer instanceof Error) throw answer;
      return (async function* () {
        yield* answer;
      })();
    },
  };
  // the service starts timeout timers it never clears (2 minutes); fake them so they cannot keep this test alive
  testMock.timers.enable({ apis: ['setTimeout'] });
  try {
    await handleStreamingChatCompletion(res, aiService, { messages: [] }, executeTools);
  } finally {
    testMock.timers.reset();
  }
  assert.equal(res.writableEnded, true);
  return parse(written);
}

async function mockService(reply: AiReply, body: Record<string, unknown> = {}) {
  const mock = createMockQelos({ logger: () => {} });
  mock.ai.reply('*', reply);
  const res = await mock.fetch('/api/ai/agent-1/chat-completion?stream=true', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-qelos-mock-persona': '' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], ...body }),
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/event-stream/);
  const raw = await res.text();
  assert.equal(raw.includes('[DONE]'), false, 'the service never sends [DONE]');
  return parse(raw);
}

describe('the mock streams what the AI service streams', () => {
  test('a text answer: chunk events, then done', async () => {
    const real = await realService([[text('Hel'), text('lo'), stop()]]);
    assert.deepEqual(await mockService({ chunks: ['Hel', 'lo'] }), real);
    assert.deepEqual(real, [{ type: 'chunk', content: 'Hel' }, { type: 'chunk', content: 'lo' }, { type: 'done' }]);
  });

  test('tools the service runs itself: detected, continuing, follow-up chunks, done', async () => {
    const real = await realService([[text('Checking. '), toolCall('call_mock_1', 'weather', '{"city":"Paris"}')], [text('21°C'), stop()]]);
    const mock = await mockService({ content: 'Checking. ', toolCalls: [{ name: 'weather', arguments: { city: 'Paris' } }], followup: '21°C' });
    // the per-call events come from the tool runner, which this test replaces with a stub
    const runner = ['function_executing', 'function_executed'];
    const core = (events: Event[]) => events.filter((e) => !runner.includes(e.type) && !(e.type === 'function_calls_detected' && e.functionCalls));
    assert.deepEqual(core(mock), real);
    assert.deepEqual(
      mock.map((e) => e.type),
      ['chunk', 'function_calls_detected', 'function_calls_detected', 'function_executing', 'function_executed', 'continuing_conversation', 'followup_chunk', 'done'],
    );
  });

  test('tools the app runs (clientTools): client_tool_calls, then done', async () => {
    // what the service's controller does for client tools: announce them and stop the completion loop
    const real = await realService([[toolCall('call_mock_1', 'openModal', '{}')]], async (calls, sendSSE) => {
      sendSSE({ type: 'client_tool_calls', functionCalls: calls, backendResults: [], assistantToolCalls: calls });
      throw Object.assign(new Error('CLIENT_TOOL_CALLS_PENDING'), { name: 'ClientToolCallsPending' });
    });
    const mock = await mockService({ toolCalls: [{ name: 'openModal' }] }, { clientTools: [{ name: 'openModal', description: 'x' }] });
    assert.deepEqual(mock, real);
    assert.deepEqual(mock.map((e) => e.type), ['function_calls_detected', 'client_tool_calls', 'done']);
  });

  test('a provider failure: an error event inside a 200 stream, and no done', async () => {
    const real = await realService([new Error('model overloaded')]);
    const mock = await mockService({ error: { status: 503, message: 'model overloaded' } });
    assert.deepEqual(mock.map((e) => ({ type: e.type, message: e.message })), real.map((e) => ({ type: e.type, message: e.message })));
    assert.deepEqual(mock, [{ type: 'error', message: 'model overloaded' }]);
  });
});
