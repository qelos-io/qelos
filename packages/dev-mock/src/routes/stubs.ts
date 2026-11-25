import { MockHttpError, type RouteModule } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { requireAdmin, type ActorResolver } from './actor.js';

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

function completion(content: string, threadId?: string) {
  const tokens = Math.ceil(content.length / 4);
  return {
    id: `chatcmpl-mock-${Date.now().toString(36)}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'qelos-mock',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 0, completion_tokens: tokens, total_tokens: tokens },
    ...(threadId ? { thread: threadId } : {}),
  };
}

function sse(content: string): Response {
  const created = Math.floor(Date.now() / 1000);
  const chunk = (delta: object, finish: string | null) =>
    `data: ${JSON.stringify({ id: 'chatcmpl-mock', object: 'chat.completion.chunk', created, model: 'qelos-mock', choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
  const body = chunk({ role: 'assistant', content }, null) + chunk({}, 'stop') + 'data: [DONE]\n\n';
  return new Response(body, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' } });
}

function paginate<T>(list: T[], query: URLSearchParams): T[] {
  const limit = parseInt(query.get('limit') || '') || undefined;
  const page = Math.max(parseInt(query.get('page') || '') || 1, 1);
  return limit ? list.slice((page - 1) * limit, page * limit) : list;
}

/** Deterministic stubs for the services an app normally proxies: AI, events, lambdas, payments, secrets. */
export function stubRoutes({ resolveActor }: { resolveActor: ActorResolver }): RouteModule {
  return (router, state) => {
    // ---- AI agents (seeded in `agents`) + chat completions
    router.register('GET', '/api/ai/agents', () => state.agents.list());
    router.register('POST', '/api/ai/agents', async (ctx) => {
      requireAdmin(await resolveActor(ctx));
      return state.agents.insert((await ctx.json()) || {});
    });
    router.register('POST', '/api/ai/agents/:id/chat', async (ctx) => {
      const body = (await ctx.json()) || {};
      return completion(aiReply(state, ctx.params.id, lastUserMessage(body.messages)), body.threadId);
    });
    router.register('GET', '/api/ai/agents/:id/chat', (ctx) => {
      let messages: any[] = [];
      try {
        messages = JSON.parse(ctx.query.get('messages') || '[]');
      } catch {}
      const message = lastUserMessage(messages) || ctx.query.get('message') || '';
      return sse(aiReply(state, ctx.params.id, message));
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
        const content = aiReply(state, ctx.params.id, lastUserMessage(body.messages));
        return ctx.query.get('stream') === 'true' ? sse(content) : completion(content, ctx.params.threadId);
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
