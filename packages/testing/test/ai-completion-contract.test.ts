import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockQelos } from '../src/index.js';
import type { AiReply } from '../src/ai/ai-stub.js';

/**
 * Contract between the mock and the real AI service for non-streamed completions: the same conversation goes through
 * the service's own handler (`apps/ai`, with a fake model provider) and through the mock.
 */
const services = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'apps', 'ai', 'server', 'services');

const call = (id: string, name: string, args = '{}') => ({ id, type: 'function', function: { name, arguments: args } });
const answer = (content: string, tool_calls?: unknown[]) => ({
  choices: [{ index: 0, message: { role: 'assistant', content, ...(tool_calls ? { tool_calls } : {}) }, finish_reason: tool_calls ? 'tool_calls' : 'stop' }],
});

async function realService(turns: Array<object | Error>, executeTools: (calls: any[]) => Promise<any> = async () => []) {
  const { handleNonStreamingChatCompletion } = await import(join(services, 'chat-completion-service'));
  let turn = 0;
  const aiService = {
    async createChatCompletion() {
      const next = turns[turn++];
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return handleNonStreamingChatCompletion(aiService, { messages: [] }, executeTools);
}

async function mockService(reply: AiReply, body: Record<string, unknown> = {}) {
  const mock = createMockQelos({ logger: () => {} });
  mock.ai.reply('*', reply);
  const res = await mock.fetch('/api/ai/agent-1/chat-completion', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }], ...body }),
  });
  return { status: res.status, body: (await res.json()) as any };
}

/** The parts of a completion an app reads (ids, timestamps and usage differ by nature). */
const essentials = (completion: any) => ({
  message: { role: completion.choices[0].message.role, content: completion.choices[0].message.content },
  finish_reason: completion.choices[0].finish_reason,
  function_calls: completion.function_calls,
  function_results: completion.function_results,
});

describe('the mock answers non-streamed completions like the AI service', () => {
  test('a text answer', async () => {
    const real = await realService([answer('Hello')]);
    const mock = await mockService({ content: 'Hello' });
    assert.deepEqual(essentials(mock.body), essentials(real));
  });

  test('tools the service runs itself: the final answer, with the calls and their results', async () => {
    const { createFunctionResult } = await import(join(services, 'chat-completion-service'));
    const calls = [call('call_mock_1', 'weather', '{"city":"Paris"}')];
    const real = await realService([answer('', calls), answer('21°C')], async (made) => made.map((c) => createFunctionResult(c, [{ temp: 21 }])));
    const mock = await mockService({ toolCalls: [{ name: 'weather', arguments: { city: 'Paris' }, result: { temp: 21 } }], followup: '21°C' });
    assert.deepEqual(essentials(mock.body), essentials(real));
    assert.equal(mock.body.choices[0].message.tool_calls, undefined, 'tool calls the service ran are not handed to the app');
  });

  test('client tools, next to a server tool: client_tool_calls with the server results', async () => {
    const { createFunctionResult } = await import(join(services, 'chat-completion-service'));
    const calls = [call('call_mock_1', 'openModal'), call('call_mock_2', 'lookup')];
    // what the service's controller does: run the server tools, then stop on the client ones
    const real = await realService([answer('', calls)], async (made) => {
      throw Object.assign(new Error('CLIENT_TOOL_CALLS_PENDING'), {
        name: 'ClientToolCallsPending',
        clientCalls: [made[0]],
        backendResults: [createFunctionResult(made[1], [{ id: 7 }])],
        allToolCalls: made,
      });
    });
    const mock = await mockService(
      { toolCalls: [{ name: 'openModal' }, { name: 'lookup', result: { id: 7 } }] },
      { clientTools: [{ name: 'openModal', description: 'x' }] },
    );
    assert.deepEqual(mock.body, real);
  });

  test('a provider failure: an error response with the same fields', async () => {
    const { createErrorResponse } = await import(join(services, 'error-analysis'));
    await assert.rejects(realService([new Error('model overloaded')]), /model overloaded/);
    const real = createErrorResponse(new Error('model overloaded'), {}, 'r1');
    const mock = await mockService({ error: { status: 500, message: 'model overloaded' } });
    assert.equal(mock.status, 500);
    assert.deepEqual({ error: mock.body.error, message: mock.body.message }, { error: real.error, message: real.message });
  });
});
