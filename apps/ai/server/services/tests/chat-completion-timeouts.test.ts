import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleNonStreamingChatCompletion, handleStreamingChatCompletion } from '../chat-completion-service';

/**
 * A completion that finished in time must leave no timeout timer behind: each of those timers reports an AI
 * provider "timeout" event when it fires, minutes after the request already succeeded.
 */
const LONG = 60_000;
const pending = new Set<unknown>();
const realSetTimeout = global.setTimeout;
const realClearTimeout = global.clearTimeout;

beforeEach(() => {
  pending.clear();
  global.setTimeout = ((callback: (...a: unknown[]) => void, ms?: number, ...args: unknown[]) => {
    const timer = realSetTimeout(callback, ms, ...args);
    if ((ms ?? 0) >= LONG) {
      pending.add(timer);
      // do not let a leaked timer keep the test process waiting for minutes
      timer.unref();
    }
    return timer;
  }) as typeof setTimeout;
  global.clearTimeout = ((timer: any) => {
    pending.delete(timer);
    realClearTimeout(timer);
  }) as typeof clearTimeout;
});

afterEach(() => {
  pending.forEach((timer) => realClearTimeout(timer as any));
  global.setTimeout = realSetTimeout;
  global.clearTimeout = realClearTimeout;
});

const context = { tenant: 'tenant-1', integrationId: 'integration-1' };
const answer = (content: string, tool_calls?: unknown[]) => ({ choices: [{ message: { role: 'assistant', content, tool_calls } }] });
const call = { id: 'c1', type: 'function', function: { name: 'tool', arguments: '{}' } };
const runTools = async () => [{ tool_call_id: 'c1', role: 'tool', type: 'function', name: 'tool', content: 'ok' }];

describe('chat completion timeouts', () => {
  it('a non-streaming completion leaves no timer behind', async () => {
    const result: any = await handleNonStreamingChatCompletion({ createChatCompletion: async () => answer('hi') }, { messages: [] }, runTools, [], undefined, context);
    assert.equal(result.choices[0].message.content, 'hi');
    assert.equal(pending.size, 0);
  });

  it('a non-streaming completion with tool calls leaves none either (initial, tools, follow-up)', async () => {
    let turn = 0;
    const aiService = { createChatCompletion: async () => (turn++ === 0 ? answer('', [call]) : answer('after the tool')) };
    await handleNonStreamingChatCompletion(aiService, { messages: [] }, runTools, [], undefined, context);
    assert.equal(turn, 2);
    assert.equal(pending.size, 0);
  });

  it('a failed completion leaves no timer behind', async () => {
    const aiService = {
      createChatCompletion: async () => {
        throw new Error('provider down');
      },
    };
    await assert.rejects(handleNonStreamingChatCompletion(aiService, { messages: [] }, runTools, [], undefined, {}), /provider down/);
    assert.equal(pending.size, 0);
  });

  it('a streamed completion that continues after a tool call leaves no timer behind', async () => {
    let turn = 0;
    const turns = [
      [{ choices: [{ delta: { tool_calls: [call] }, finish_reason: 'tool_calls' }] }],
      [{ choices: [{ delta: { content: 'done' } }] }, { choices: [{ delta: {}, finish_reason: 'stop' }] }],
    ];
    const aiService = {
      createChatCompletionStream: async () => {
        const chunks = turns[turn++];
        return (async function* () {
          yield* chunks;
        })();
      },
    };
    let written = '';
    const res = { writableEnded: false, write: (s: string) => (written += s), end() { this.writableEnded = true; } };
    await handleStreamingChatCompletion(res, aiService, { messages: [] }, runTools, [], undefined, context);
    assert.equal(turn, 2);
    assert.match(written, /followup_chunk/);
    assert.equal(pending.size, 0);
  });
});
