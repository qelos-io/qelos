import { MockHttpError, type RouteModule } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { requireAdmin, type ActorResolver } from './actor.js';
import type { AiReply, AiStub } from '../ai/ai-stub.js';

const lastUserMessage = (messages: any[] = []): string => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') return String(messages[i].content ?? '');
  }
  return '';
};

/** Seeded `aiResponses` (`{ agentId?, match?, content }`, first match wins) or an echo of the user message. */
function aiReply(state: MockState, agentId: string, message: string): string {
  const hit = state.aiResponses.findOne(
    (r) => (!r.agentId || r.agentId === agentId) && (!r.match || message.toLowerCase().includes(String(r.match).toLowerCase())),
  );
  return hit ? String(hit.content ?? '') : `Mock response: ${message}`;
}

const toolCallsOf = (r: AiReply) =>
  (r.toolCalls || []).map((t, index) => ({
    id: t.id ?? `call_mock_${index + 1}`,
    type: 'function',
    function: {
      name: t.name,
      arguments: typeof t.arguments === 'string' ? t.arguments : JSON.stringify(t.arguments ?? {}),
    },
  }));

function completion(reply: AiReply, threadId?: string) {
  const content = reply.chunks ? reply.chunks.join('') : (reply.content ?? '');
  const tool_calls = toolCallsOf(reply);
  const tokens = Math.ceil(content.length / 4);
  return {
    id: `chatcmpl-mock-${Date.now().toString(36)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'qelos-mock',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content, ...(tool_calls.length ? { tool_calls } : {}) },
        finish_reason: tool_calls.length ? 'tool_calls' : 'stop',
      },
    ],
    usage: { prompt_tokens: 0, completion_tokens: tokens, total_tokens: tokens },
    ...(threadId ? { thread: threadId } : {}),
  };
}

/**
 * The server-sent events the Qelos AI service writes for a streamed completion (`apps/ai`): `{type: "chunk"}` text,
 * tool events, `{type: "done"}` at the end, or `{type: "error"}` when the provider fails. No `[DONE]` marker.
 * Tool calls the app declared in `clientTools` are handed back to it (`client_tool_calls`); the others count as run
 * by the service, which then continues the conversation (`followup`).
 */
function streamEvents(reply: AiReply, clientTools: string[]): Array<Record<string, unknown>> {
  if (reply.error) {
    return [{ type: 'error', message: reply.error.message ?? `Mock AI error ${reply.error.status}` }];
  }
  const events: Array<Record<string, unknown>> = (reply.chunks ?? (reply.content ? [reply.content] : [])).map((content) => ({
    type: 'chunk',
    content,
  }));
  const calls = toolCallsOf(reply);
  if (calls.length) {
    events.push({ type: 'function_calls_detected' });
    const mine = calls.filter((c) => clientTools.includes(c.function.name));
    const theirs = calls.filter((c) => !clientTools.includes(c.function.name));
    if (theirs.length) {
      events.push({ type: 'function_calls_detected', functionCalls: theirs });
      for (const functionCall of theirs) {
        events.push({ type: 'function_executing', functionCall }, { type: 'function_executed', functionCall });
      }
    }
    if (mine.length) {
      events.push({ type: 'client_tool_calls', functionCalls: mine, backendResults: [], assistantToolCalls: calls });
    } else {
      events.push({ type: 'continuing_conversation' });
      for (const content of ([] as string[]).concat(reply.followup ?? [])) events.push({ type: 'followup_chunk', content });
    }
  }
  events.push({ type: 'done' });
  return events;
}

function sse(reply: AiReply, clientTools: string[]): Response {
  const body = streamEvents(reply, clientTools)
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join('');
  return new Response(body, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
}

function paginate<T>(list: T[], query: URLSearchParams): T[] {
  const limit = parseInt(query.get('limit') || '') || undefined;
  const page = Math.max(parseInt(query.get('page') || '') || 1, 1);
  return limit ? list.slice((page - 1) * limit, page * limit) : list;
}

/** Deterministic stubs for the services an app normally proxies: AI, events, lambdas, payments, secrets. */
export function stubRoutes({ resolveActor, ai }: { resolveActor: ActorResolver; ai: AiStub }): RouteModule {
  return (router, state) => {
    /** scripted reply (mock.ai) > seeded `aiResponses` > echo; records the call; honors delay/error */
    async function respond(agentId: string, messages: any[], stream: boolean, threadId?: string, clientTools: any[] = []) {
      const message = lastUserMessage(messages);
      const scripted = ai.resolve({ agentId, messages, message, stream, threadId });
      const reply: AiReply = scripted ?? { content: aiReply(state, agentId, message) };
      if (reply.delay) await new Promise((r) => setTimeout(r, reply.delay));
      // a streamed call has already answered 200 when the provider fails: the error travels inside the stream
      if (stream) return sse(reply, clientTools.map((tool) => String(tool?.name)));
      if (reply.error) {
        throw new MockHttpError(reply.error.status, reply.error.message ?? `Mock AI error ${reply.error.status}`, 'QELOS_MOCK_AI_ERROR');
      }
      return completion(reply, threadId);
    }

    // ---- AI agents (seeded in `agents`) + chat completions
    router.register('GET', '/api/ai/agents', () => state.agents.list());
    router.register('POST', '/api/ai/agents', async (ctx) => {
      requireAdmin(await resolveActor(ctx));
      return state.agents.insert((await ctx.json()) || {});
    });
    router.register('POST', '/api/ai/agents/:id/chat', async (ctx) => {
      const body = (await ctx.json()) || {};
      return respond(ctx.params.id, body.messages || [], false, body.threadId);
    });
    router.register('GET', '/api/ai/agents/:id/chat', (ctx) => {
      let messages: any[] = [];
      try {
        messages = JSON.parse(ctx.query.get('messages') || '[]');
      } catch {}
      if (!lastUserMessage(messages) && ctx.query.get('message')) messages = [{ role: 'user', content: ctx.query.get('message') }];
      return respond(ctx.params.id, messages, true);
    });
    router.register('GET', '/api/ai/agents/:id', (ctx) => {
      const agent = state.agents.get(ctx.params.id);
      if (!agent) throw new MockHttpError(404, 'agent not found');
      return agent;
    });
    router.register('PUT', '/api/ai/agents/:id', async (ctx) => {
      requireAdmin(await resolveActor(ctx));
      const { _id, ...changes } = (await ctx.json()) || {};
      const agent = state.agents.update(ctx.params.id, changes);
      if (!agent) throw new MockHttpError(404, 'agent not found');
      return agent;
    });
    router.register('DELETE', '/api/ai/agents/:id', async (ctx) => {
      requireAdmin(await resolveActor(ctx));
      if (!state.agents.remove(ctx.params.id)) throw new MockHttpError(404, 'agent not found');
      return { success: true };
    });
    for (const path of ['/api/ai/:id/chat-completion', '/api/ai/:id/chat-completion/:threadId']) {
      router.register('POST', path, async (ctx) => {
        const body = (await ctx.json()) || {};
        // like the service: stream when asked in the query or through the accept header
        const stream = ctx.query.get('stream') === 'true' || (ctx.request.headers.get('accept') ?? '').includes('text/event-stream');
        return respond(ctx.params.id, body.messages || [], stream, ctx.params.threadId, body.clientTools || []);
      });
    }

    // ---- events (in-memory list/emit)
    router.register('GET', '/api/events', (ctx) => {
      const q = ctx.query;
      const search = q.get('search')?.toLowerCase();
      const events = state.events
        .list((e) =>
          ['kind', 'eventName', 'source', 'user', 'workspace'].every((k) => !q.get(k) || String(e[k]) === q.get(k)) &&
          (!search || JSON.stringify(e).toLowerCase().includes(search)) &&
          (!q.get('from') || String(e.created) >= q.get('from')!) &&
          (!q.get('to') || String(e.created) <= q.get('to')!),
        )
        .sort((a, b) => String(b.created).localeCompare(String(a.created)));
      return paginate(events, q);
    });
    router.register('GET', '/api/events/:id', (ctx) => {
      const event = state.events.get(ctx.params.id);
      if (!event) throw new MockHttpError(404, 'event not found');
      return event;
    });
    router.register('POST', '/api/events', async (ctx) => {
      const body = (await ctx.json()) || {};
      return state.events.insert({ source: 'mock', kind: 'mock', eventName: 'event', description: '', ...body, created: new Date().toISOString() });
    });

    // ---- lambdas / integration triggers: seeded `{ integrationId, method?, response, status? }` or `{}`
    router.register('*', '/api/webhooks/:id', (ctx) => {
      const method = ctx.request.method.toUpperCase();
      const hit: Doc | undefined = state.lambdas.findOne(
        (l) => l.integrationId === ctx.params.id && (!l.method || String(l.method).toUpperCase() === method),
      );
      return new Response(JSON.stringify(hit ? (hit.response ?? {}) : {}), {
        status: Number(hit?.status) || 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    // ---- payments: nothing sold, nothing owned
    router.register('GET', '/api/plans/public', () => []);
    router.register('GET', '/api/plans/:id', () => {
      throw new MockHttpError(404, 'plan not found');
    });
    router.register('GET', '/api/invoices', () => []);
    router.register('GET', '/api/subscriptions/me', () => {
      throw new MockHttpError(404, 'subscription not found');
    });
    router.register('GET', '/api/subscriptions/:id/activity', () => []);

    // ---- secrets: never returned, never stored
    router.register('GET', '/api/secrets', () => []);
    router.register('GET', '/api/secrets/*', () => {
      throw new MockHttpError(404, 'secret not found');
    });
    for (const method of ['POST', 'PUT', 'DELETE'] as const) router.register(method, '/api/secrets/*', () => ({}));
    router.register('POST', '/api/secrets', () => ({}));
  };
}
