import { afterEach, beforeEach, describe, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { QelosChatWidget, type QelosChatWidgetOptions } from '../src/chat-widget';

/**
 * The chat widget in a real DOM (happy-dom), talking to a fake `fetch` that streams server-sent events in the
 * format the Qelos AI service writes: `data: {"type":"chunk","content":"..."}` ... `data: {"type":"done"}`.
 */
type Request = { url: string; method: string; headers: Record<string, string>; body: any };

let window: Window;
let requests: Request[] = [];
let respond: (request: Request) => Response | Promise<Response>;
let widgets: QelosChatWidget[] = [];

const sse = (...events: Array<object | string>) => events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join('');

/** A streaming response delivered in the given pieces (they need not end on line boundaries). */
const stream = (...pieces: string[]) =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const piece of pieces) controller.enqueue(new TextEncoder().encode(piece));
        controller.close();
      },
    }),
    { headers: { 'content-type': 'text/event-stream' } },
  );

const answer = (text: string) => stream(sse({ type: 'chunk', content: text }, { type: 'done' }));

beforeEach(() => {
  window = new Window({ url: 'http://app.test/' });
  (globalThis as any).document = window.document;
  requests = [];
  respond = () => answer('ok');
  globalThis.fetch = (async (url: any, init: any = {}) => {
    const request = { url: String(url), method: init.method ?? 'GET', headers: { ...init.headers }, body: init.body ? JSON.parse(init.body) : undefined };
    requests.push(request);
    return respond(request);
  }) as typeof fetch;
});

afterEach(() => {
  widgets.forEach((w) => w.destroy());
  widgets = [];
});

function mount(options: Partial<QelosChatWidgetOptions> = {}) {
  const container = window.document.createElement('div');
  window.document.body.appendChild(container);
  const widget = new QelosChatWidget({ agentId: 'agent-1', appUrl: 'https://qelos.test/', apiToken: 'pk_1', container: container as any, ...options });
  widgets.push(widget);
  const shadow = (container.querySelector('[data-qelos-chat-widget]') as any).shadowRoot;
  const $ = (selector: string) => shadow.querySelector(selector) as any;
  const bubbles = () => [...shadow.querySelectorAll('.messages .msg')].map((el: any) => ({ role: el.className.replace('msg ', ''), text: el.textContent as string, html: el.innerHTML as string }));
  const idle = async () => {
    for (let i = 0; i < 200 && $('textarea').disabled; i++) await new Promise((r) => setTimeout(r, 5));
    assert.equal($('textarea').disabled, false, 'the widget is still sending');
  };
  const type = (text: string) => ($('textarea').value = text);
  const submit = () => $('form').dispatchEvent(new window.Event('submit', { cancelable: true }));
  const say = async (text: string) => {
    type(text);
    submit();
    await idle();
  };
  return { widget, container, shadow, $, bubbles, idle, type, submit, say };
}

describe('open, close and destroy', () => {
  test('starts closed, toggles with the launcher and the close button, and reports it to assistive technology', () => {
    const { $ } = mount();
    assert.equal($('.panel').getAttribute('data-open'), null);
    $('.launcher').click();
    assert.equal($('.panel').getAttribute('data-open'), 'true');
    assert.equal($('.launcher').getAttribute('aria-expanded'), 'true');
    $('header .close').click();
    assert.equal($('.panel').getAttribute('data-open'), null);
    assert.equal($('.launcher').getAttribute('aria-expanded'), 'false');
  });

  test('autoOpen, initialMessage, headerText and inputPlaceholder', () => {
    const { $, bubbles } = mount({ autoOpen: true, initialMessage: 'Welcome!', headerText: 'Helper', inputPlaceholder: 'Ask me' });
    assert.equal($('.panel').getAttribute('data-open'), 'true');
    assert.deepEqual(bubbles().map((b) => [b.role, b.text]), [['assistant', 'Welcome!']]);
    assert.equal($('.title').textContent, 'Helper');
    assert.equal($('textarea').placeholder, 'Ask me');
  });

  test('destroy removes the widget, and a destroyed widget does not open or send', async () => {
    const { widget, container, $, submit } = mount();
    const textarea = $('textarea');
    widget.destroy();
    assert.equal(container.children.length, 0);
    widget.open();
    assert.equal($('.panel').getAttribute('data-open'), null);
    textarea.value = 'hi';
    submit();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(requests.length, 0);
  });
});

describe('sending a message', () => {
  test('posts the conversation to the agent with the API token and asks for a stream', async () => {
    const { say } = mount();
    await say('  Hello  ');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://qelos.test/api/ai/agent-1/chat-completion?stream=true');
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].headers['x-api-key'], 'pk_1');
    assert.equal(requests[0].headers.accept, 'text/event-stream');
    assert.equal(requests[0].headers.authorization, undefined);
    assert.deepEqual(requests[0].body, { messages: [{ role: 'user', content: 'Hello' }], stream: true });
  });

  test('uses a bearer token when there is no API token, and sends the chat context', async () => {
    const { say } = mount({ apiToken: undefined, accessToken: 'user-token', chatContext: { page: 'pricing', seats: 3 } });
    await say('hi');
    assert.equal(requests[0].headers.authorization, 'Bearer user-token');
    assert.equal(requests[0].headers['x-api-key'], undefined);
    assert.deepEqual(requests[0].body.context, { page: 'pricing', seats: 3 });
  });

  test('sends the earlier turns along with the new message', async () => {
    const { say } = mount();
    respond = () => answer('First answer');
    await say('one');
    respond = () => answer('Second answer');
    await say('two');
    assert.deepEqual(requests[1].body.messages, [
      { role: 'user', content: 'one' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'two' },
    ]);
  });

  test('Enter sends, Shift+Enter does not', async () => {
    const { $, type, idle } = mount();
    const press = (extra: object = {}) => $('textarea').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', cancelable: true, ...extra }));
    type('multi');
    press({ shiftKey: true });
    assert.equal(requests.length, 0);
    press();
    await idle();
    assert.equal(requests.length, 1);
  });

  test('ignores an empty message', async () => {
    const { type, submit, bubbles } = mount();
    type('   ');
    submit();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(requests.length, 0);
    assert.equal(bubbles().length, 0);
  });

  test('while an answer is coming, the input is disabled and a second message is not sent', async () => {
    let finish!: () => void;
    respond = () =>
      new Response(
        new ReadableStream({
          start(controller) {
            finish = () => {
              controller.enqueue(new TextEncoder().encode(sse({ type: 'chunk', content: 'done now' })));
              controller.close();
            };
          },
        }),
      );
    const { $, type, submit, idle, bubbles } = mount();
    type('first');
    submit();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal($('textarea').disabled, true);
    assert.equal($('.send').disabled, true);
    assert.equal($('.status').textContent, 'AI is typing…');
    type('second');
    submit();
    finish();
    await idle();
    assert.equal(requests.length, 1);
    assert.equal(bubbles().at(-1)!.text, 'done now');
    assert.equal($('.status').textContent, '');
  });
});

describe('threads', () => {
  test('with recordThread, creates a thread once and chats inside it', async () => {
    respond = (r) => (r.url.endsWith('/api/ai/threads') ? Response.json({ _id: 'th-9' }) : answer('ok'));
    const { say } = mount({ recordThread: true });
    await say('one');
    await say('two');
    assert.deepEqual(requests.map((r) => r.url.replace('https://qelos.test', '')), [
      '/api/ai/threads',
      '/api/ai/agent-1/chat-completion/th-9?stream=true',
      '/api/ai/agent-1/chat-completion/th-9?stream=true',
    ]);
    assert.deepEqual(requests[0].body, { integration: 'agent-1' });
    assert.equal(requests[0].headers.accept, undefined);
  });

  test('resumes the thread it is given without creating one', async () => {
    const { say } = mount({ recordThread: true, threadId: 'old' });
    await say('hi');
    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /chat-completion\/old\?stream=true$/);
  });

  test('shows an error when the thread cannot be created', async () => {
    respond = () => new Response('no', { status: 403 });
    const { say, $ } = mount({ recordThread: true });
    await say('hi');
    assert.equal(requests.length, 1);
    assert.match($('.status').textContent, /Failed to create thread: HTTP 403/);
    assert.equal($('.status').classList.contains('error'), true);
  });
});

describe('the streamed answer', () => {
  test('appends chunks, also from follow-ups, and stops at [DONE]', async () => {
    respond = () => stream(sse({ type: 'connection_established' }, { type: 'chunk', content: 'Hel' }, { type: 'followup_chunk', content: 'lo' }, '[DONE]', { type: 'chunk', content: ' never' }));
    const { say, bubbles } = mount();
    await say('hi');
    assert.equal(bubbles().at(-1)!.text, 'Hello');
  });

  test('handles events split across network pieces, and skips lines that are not JSON', async () => {
    const whole = sse({ type: 'chunk', content: 'split ' }, 'not json', { type: 'chunk', content: 'answer' });
    respond = () => stream(whole.slice(0, 11), whole.slice(11, 47), whole.slice(47));
    const { say, bubbles } = mount();
    await say('hi');
    assert.equal(bubbles().at(-1)!.text, 'split answer');
  });

  test('starts the answer over when the agent continues after running tools', async () => {
    respond = () => stream(sse({ type: 'chunk', content: 'Let me check…' }, { type: 'function_calls_detected' }, { type: 'continuing_conversation' }, { type: 'followup_chunk', content: 'It is 21°C.' }));
    const { say, bubbles } = mount();
    await say('weather?');
    assert.equal(bubbles().at(-1)!.text, 'It is 21°C.');
  });

  test('an HTTP error shows an apology in the conversation and the reason in the status line', async () => {
    respond = () => new Response('boom', { status: 500, statusText: 'Internal Server Error' });
    const { say, bubbles, $ } = mount();
    await say('hi');
    assert.match(bubbles().at(-1)!.text, /could not get a response/);
    assert.equal($('.status').textContent, 'HTTP 500: Internal Server Error');
  });

  test('a network failure keeps what already arrived and reports the problem', async () => {
    respond = () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sse({ type: 'chunk', content: 'partial' })));
            setTimeout(() => controller.error(new Error('connection lost')), 5);
          },
        }),
      );
    const { say, bubbles, $ } = mount();
    await say('hi');
    assert.equal(bubbles().at(-1)!.text, 'partial');
    assert.equal($('.status').textContent, 'connection lost');
  });

  // The AI service reports failures inside the stream as {"type":"error"}; the widget has no case for it.
  test('shows an error the service sends inside the stream', { todo: 'handleSSEEvent ignores "error" events: the user sees an empty answer and no message' }, async () => {
    respond = () => stream(sse({ type: 'error', message: 'model overloaded' }));
    const { say, bubbles, $ } = mount();
    await say('hi');
    assert.equal($('.status').textContent, 'model overloaded');
    assert.notEqual(bubbles().at(-1)!.text, '');
  });

  // Some providers send the whole message as one {"type":"full_content"} event.
  test('shows a full_content event', { todo: 'handleSSEEvent ignores "full_content" events: the answer stays empty' }, async () => {
    respond = () => stream(sse({ type: 'full_content', content: 'The whole answer' }, { type: 'done' }));
    const { say, bubbles } = mount();
    await say('hi');
    assert.equal(bubbles().at(-1)!.text, 'The whole answer');
  });
});

describe('rendering', () => {
  test('never turns message text into markup', async () => {
    const attack = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
    respond = () => answer(attack);
    const { say, bubbles, shadow } = mount();
    await say(attack);
    assert.equal(shadow.querySelectorAll('.messages img, .messages script').length, 0);
    assert.deepEqual(bubbles().map((b) => b.text), [attack, attack]);
  });

  test('renders the supported markdown: code, bold, emphasis, line breaks and safe links', async () => {
    respond = () => answer('**bold** *soft* `x<y`\n[docs](https://docs.qelos.test/a)');
    const { say, shadow } = mount();
    await say('hi');
    const el = [...shadow.querySelectorAll('.messages .msg.assistant')].at(-1) as any;
    assert.equal(el.querySelector('strong').textContent, 'bold');
    assert.equal(el.querySelector('em').textContent, 'soft');
    assert.equal(el.querySelector('code').textContent, 'x<y');
    assert.equal(el.querySelectorAll('br').length, 1);
    const link = el.querySelector('a');
    assert.equal(link.getAttribute('href'), 'https://docs.qelos.test/a');
    assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
  });

  test('does not link javascript: or data: urls, and a link url cannot break out of its attribute', async () => {
    respond = () => answer('[a](javascript:alert(1)) [b](data:text/html,x) [c](https://x.test/" onclick="alert(1))');
    const { say, shadow } = mount();
    await say('hi');
    const links = [...shadow.querySelectorAll('.messages .msg.assistant a')] as any[];
    assert.ok(links.every((a) => a.getAttribute('href').startsWith('https://')));
    assert.ok(links.every((a) => a.getAttribute('onclick') === null));
  });
});
