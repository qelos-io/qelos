import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createMockSdk } from '../src/sdk/index.js';

const personas = [
  { email: 'admin@x.com', password: 'pw', roles: ['admin'] },
  { email: 'ada@x.com', password: 'pw', roles: ['user'], workspaces: [{ name: 'Acme' }] },
  { email: 'bob@x.com', password: 'pw', roles: ['user'] },
];
const agents = [
  { _id: 'a'.repeat(24), trigger: { details: { recordThread: true } } },
  { _id: 'b'.repeat(24), trigger: { details: {} } },
];
const [recording, forgetful] = agents.map((a) => a._id);

function setup(seed: object = { personas, agents }) {
  const t = createMockSdk({ seed });
  const as = (email: string) => t.as(email) as any;
  return { ...t, ada: as('ada@x.com'), bob: as('bob@x.com'), admin: as('admin@x.com'), anonymous: t.sdk as any };
}

const send = (sdk: any, agent: string, thread: string, content: string, extra: object = {}) =>
  sdk.ai.chat.chatInThread(agent, thread, { messages: [{ role: 'user', content }], ...extra });
const roles = (thread: any) => thread.messages.map((m: any) => `${m.role}:${m.content ?? ''}`);

describe('sdk.ai threads', () => {
  test('create, read, list and delete', async () => {
    const { ada } = setup();
    const thread = await ada.ai.createThread({ integration: recording });
    assert.match(thread._id, /^[0-9a-f]{24}$/);
    assert.equal(thread.integration, recording);
    assert.deepEqual(thread.messages, []);
    assert.equal((await ada.ai.getThread(thread._id))._id, thread._id);

    const list = await ada.ai.listThreads();
    assert.equal(list.length, 1);
    assert.equal('messages' in list[0], false, 'the list carries no messages');

    assert.deepEqual(await ada.ai.deleteThread(thread._id), { message: 'Thread deleted successfully' });
    await assert.rejects(ada.ai.getThread(thread._id), /Thread not found|404/);
  });

  test('needs a signed-in user and a known agent', async () => {
    const { ada, anonymous, mock } = setup();
    await assert.rejects(anonymous.ai.createThread({ integration: recording }));
    const create = (body: object) =>
      mock.fetch('/api/ai/threads', { method: 'POST', headers: { 'x-qelos-mock-persona': 'ada@x.com' }, body: JSON.stringify(body) });
    assert.equal((await create({})).status, 400);
    assert.equal((await create({ integration: 'c'.repeat(24) })).status, 404);
    assert.equal((await create({ integration: recording })).status, 201);
    assert.equal((await ada.ai.listThreads()).length, 1);
  });

  test('users see their own threads; admins see all, unless they bypass their privileges', async () => {
    const { ada, bob, admin } = setup();
    const mine = await ada.ai.createThread({ integration: recording });
    const his = await bob.ai.createThread({ integration: forgetful });
    assert.deepEqual((await ada.ai.listThreads()).map((t: any) => t._id), [mine._id]);
    await assert.rejects(bob.ai.getThread(mine._id));
    await assert.rejects(bob.ai.deleteThread(mine._id));
    assert.equal((await admin.ai.listThreads()).length, 2);
    assert.deepEqual((await admin.ai.listThreads({ integration: forgetful })).map((t: any) => t._id), [his._id]);
    assert.equal((await admin.ai.listThreads({ bypassAdmin: 'true' })).length, 0);
    assert.equal((await admin.ai.getThread(mine._id))._id, mine._id);
  });
});

describe('conversations are recorded in threads', () => {
  test('a chat in a thread stores the question and the answer, turn after turn', async () => {
    const { ada, mock } = setup();
    mock.ai.reply('*', ['first answer', 'second answer']);
    const thread = await ada.ai.createThread({ integration: recording });
    await send(ada, recording, thread._id, 'one');
    await send(ada, recording, thread._id, 'two');
    const stored = await ada.ai.getThread(thread._id);
    assert.deepEqual(roles(stored), ['user:one', 'assistant:first answer', 'user:two', 'assistant:second answer']);
    assert.equal(stored.title, 'one');
    assert.ok(stored.messages.every((m: any) => m.timestamp));
  });

  test('a new thread stamps messages on arrival', async () => {
    const { ada, mock } = setup();
    mock.ai.reply('*', 'ok');
    const thread = await ada.ai.createThread({ integration: recording });
    await ada.ai.chat.chatInThread(recording, thread._id, {
      messages: [{ role: 'user', content: 'one', timestamp: '2000-01-01T00:00:00.000Z' }],
    });
    const [stored] = (await ada.ai.getThread(thread._id)).messages;
    assert.ok(stored.timestamp > '2001');
  });

  test('a message older than the thread is not stored again', async () => {
    const { ada, mock } = setup();
    mock.ai.reply('*', 'ok');
    const thread = await ada.ai.createThread({ integration: recording });
    await send(ada, recording, thread._id, 'one');
    await ada.ai.chat.chatInThread(recording, thread._id, {
      messages: [{ role: 'user', content: 'one', timestamp: '2000-01-01T00:00:00.000Z' }, { role: 'user', content: 'two' }],
    });
    assert.deepEqual(roles(await ada.ai.getThread(thread._id)), ['user:one', 'assistant:ok', 'user:two', 'assistant:ok']);
  });

  test('an agent that records threads requires one the caller owns', async () => {
    const { ada, bob, mock } = setup();
    const thread = await ada.ai.createThread({ integration: recording });
    await assert.rejects(send(bob, recording, thread._id, 'sneaky'), /thread not found|404/);
    const without = await mock.fetch(`/api/ai/${recording}/chat-completion`, { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'x' }] }) });
    assert.equal(without.status, 400);
    assert.deepEqual((await ada.ai.getThread(thread._id)).messages, []);
  });

  test('an agent that does not record threads ignores the thread id', async () => {
    const { ada } = setup();
    const thread = await ada.ai.createThread({ integration: forgetful });
    await send(ada, forgetful, thread._id, 'hello');
    assert.deepEqual((await ada.ai.getThread(thread._id)).messages, []);
  });

  test('a failed answer keeps the question only', async () => {
    const { ada, mock } = setup();
    mock.ai.fail('*', 500, 'down');
    const thread = await ada.ai.createThread({ integration: recording });
    await assert.rejects(send(ada, recording, thread._id, 'one'));
    assert.deepEqual(roles(await ada.ai.getThread(thread._id)), ['user:one']);
  });

  test('server tools are stored with their results, before the answer', async () => {
    const { ada, mock } = setup();
    mock.ai.reply('*', { toolCalls: [{ name: 'lookup', result: { id: 7 } }], followup: 'Found it' });
    const thread = await ada.ai.createThread({ integration: recording });
    await send(ada, recording, thread._id, 'find');
    const stored = (await ada.ai.getThread(thread._id)).messages;
    assert.deepEqual(stored.map((m: any) => m.role), ['user', 'assistant', 'function', 'assistant']);
    assert.equal(stored[1].tool_calls[0].function.name, 'lookup');
    assert.equal(stored[2].tool_calls[0].content, '{"id":7}');
    assert.equal(stored[3].content, 'Found it');
  });

  test('agents.chat keeps each conversation in a new thread', async () => {
    const { ada, mock } = setup({ personas });
    mock.ai.reply('*', 'hi there');
    await ada.ai.agents.chat('support', 'hello');
    const [listed] = await ada.ai.listThreads();
    assert.equal(listed.integration, 'support');
    assert.deepEqual(roles(await ada.ai.getThread(listed._id)), ['user:hello', 'assistant:hi there']);
  });
});

describe('client tools', () => {
  const tools = [{ name: 'openModal', description: 'opens a modal', schema: {} }];

  test('the app gets the calls, runs them, and the next request is answered with the follow-up', async () => {
    const { ada, mock } = setup();
    mock.ai.reply('open', { toolCalls: [{ name: 'openModal', arguments: { id: 1 } }], followup: 'Opened' });
    const messages: any[] = [{ role: 'user', content: 'open it' }];
    const first = await ada.ai.chat.chat(forgetful, { messages, clientTools: tools });
    assert.equal(first.type, 'client_tool_calls');
    const [toolCall] = first.functionCalls;
    messages.push({ role: 'assistant', content: '', tool_calls: first.assistantToolCalls });
    messages.push({ role: 'tool', tool_call_id: toolCall.id, name: 'openModal', content: 'done' });
    const second = await ada.ai.chat.chat(forgetful, { messages, clientTools: tools });
    assert.equal(second.choices[0].message.content, 'Opened');
  });

  test('an agent can ask for one client tool after another', async () => {
    const { ada, mock } = setup();
    mock.ai.reply('*', [
      { toolCalls: [{ name: 'openModal', arguments: { step: 1 } }] },
      { toolCalls: [{ name: 'openModal', arguments: { step: 2 } }], followup: 'Both done' },
    ]);
    const messages: any[] = [{ role: 'user', content: 'go' }];
    const ask = () => ada.ai.chat.chat(forgetful, { messages, clientTools: tools });
    const run = (response: any) => {
      messages.push({ role: 'assistant', content: '', tool_calls: response.assistantToolCalls });
      messages.push({ role: 'tool', tool_call_id: response.functionCalls[0].id, content: 'done' });
    };
    const first = await ask();
    run(first);
    const second = await ask();
    assert.equal(second.type, 'client_tool_calls');
    assert.equal(second.functionCalls[0].function.arguments, '{"step":2}');
    assert.notEqual(second.functionCalls[0].id, first.functionCalls[0].id);
    run(second);
    // the last item of the sequence repeats, and now answers its own results
    assert.equal((await ask()).choices[0].message.content, 'Both done');
  });

  test('results sent without the assistant message are matched by id', async () => {
    const { ada, mock } = setup();
    mock.ai.reply('*', { toolCalls: [{ name: 'openModal' }], followup: 'Opened' });
    const response = await ada.ai.chat.chat(forgetful, {
      messages: [{ role: 'user', content: 'open' }, { role: 'tool', tool_call_id: 'call_mock_1', content: 'done' }],
      clientTools: tools,
    });
    assert.equal(response.choices[0].message.content, 'Opened');
  });

  test('the same works streamed: no second round of tool calls', async () => {
    const { mock } = setup();
    mock.ai.reply('open', { toolCalls: [{ name: 'openModal' }], followup: ['Open', 'ed'] });
    const stream = async (messages: any[]) => {
      const res = await mock.fetch(`/api/ai/${forgetful}/chat-completion?stream=true`, { method: 'POST', body: JSON.stringify({ messages, clientTools: tools }) });
      return (await res.text()).split('\n\n').filter(Boolean).map((l) => JSON.parse(l.slice(6)));
    };
    const messages: any[] = [{ role: 'user', content: 'open it' }];
    const first = await stream(messages);
    const pending = first.find((e) => e.type === 'client_tool_calls');
    messages.push({ role: 'assistant', content: '', tool_calls: pending.assistantToolCalls });
    messages.push({ role: 'tool', tool_call_id: pending.functionCalls[0].id, content: 'done' });
    assert.deepEqual(await stream(messages), [{ type: 'chunk', content: 'Open' }, { type: 'chunk', content: 'ed' }, { type: 'done' }]);
  });
});
