import { jsonResponse, MockHttpError, type RouteContext, type RouteModule } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { requireAdmin, type ActorResolver } from './actor.js';
import type { AiReply, AiStub } from '../ai/ai-stub.js';
import { aiTurn, completionBody, failureResponse, recordTurn, streamResponse } from '../ai/turn.js';
import { newThread, ownsThread, recordRequest } from '../ai/threads.js';
import { authenticate } from '../auth/authenticate.js';
import { isValidId } from '../state/ids.js';

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

function paginate<T>(list: T[], query: URLSearchParams): T[] {
  const limit = parseInt(query.get('limit') || '') || undefined;
  const page = Math.max(parseInt(query.get('page') || '') || 1, 1);
  return limit ? list.slice((page - 1) * limit, page * limit) : list;
}

/** Deterministic stubs for the services an app normally proxies: AI, events, lambdas, payments, secrets. */
export function stubRoutes({ resolveActor, ai }: { resolveActor: ActorResolver; ai: AiStub }): RouteModule {
  return (router, state) => {
    /** scripted reply (mock.ai) > seeded `aiResponses` > echo; records the call and the thread; honors delay/error */
    async function respond(
      agentId: string,
      messages: any[],
      stream: boolean,
      { threadId, clientTools = [] }: { threadId?: string; clientTools?: any[] } = {},
    ) {
      if (threadId) recordRequest(state, threadId, messages);
      const message = lastUserMessage(messages);
      const scripted = ai.resolve({ agentId, messages, message, stream, threadId });
      const reply: AiReply = scripted ?? { content: aiReply(state, agentId, message) };
      if (reply.delay) await new Promise((r) => setTimeout(r, reply.delay));
      if (reply.error) return failureResponse(reply.error, stream);
      const turn = aiTurn(reply, messages, clientTools.map((tool) => String(tool?.name)));
      if (threadId) recordTurn(state, threadId, turn, stream);
      return stream ? streamResponse(turn) : jsonResponse(completionBody(turn));
    }

    const threadNotFound = () => jsonResponse({ message: 'thread not found' }, 404);

    /**
     * The thread a completion is recorded in. Like the service: only agents with `recordThread` keep threads, and
     * they require one the caller owns. An agent the mock does not know uses a thread id when it names a thread.
     */
    function completionThread(ctx: RouteContext, agentId: string): string | undefined | Response {
      const agent = state.agents.get(agentId);
      const records = !!agent?.trigger?.details?.recordThread;
      if (agent && !records) return undefined;
      const { threadId } = ctx.params;
      if (!threadId) return records ? jsonResponse({ message: 'thread id is required' }, 400) : undefined;
      const thread = state.collection('threads').get(threadId);
      const auth = authenticate(ctx.request, state);
      if (thread && auth && ownsThread(thread, auth)) return threadId;
      return records || thread ? threadNotFound() : undefined;
    }

    /** `agents/:id/chat` keeps every conversation in a thread: the given one, or a new one. */
    function agentThread(ctx: RouteContext, agentId: string, threadId: unknown): string | undefined | Response {
      const auth = authenticate(ctx.request, state);
      if (!auth) return undefined;
      if (!isValidId(threadId)) return newThread(state, agentId, auth)._id;
      const thread = state.collection('threads').get(threadId);
      return thread && thread.integration === agentId && ownsThread(thread, auth) ? threadId : threadNotFound();
    }

    async function agentChat(ctx: RouteContext, messages: any[], threadId: unknown, stream: boolean) {
      const id = ctx.params.id;
      const agent = state.agents.get(id);
      // with no agents in the mock, any id answers; once some are seeded the id has to be one of them
      if (state.agents.list().length && (!agent || agent.active === false)) {
        return jsonResponse({ message: 'Agent not found' }, 404);
      }
      if (!messages.length) return jsonResponse({ message: 'messages are required' }, 400);
      const thread = agentThread(ctx, id, threadId);
      if (thread instanceof Response) return thread;
      return respond(id, messages, stream, { threadId: thread });
    }

    // ---- AI agents (seeded in `agents`) + chat completions
    router.register('GET', '/api/ai/agents', () => state.agents.list());
    router.register('POST', '/api/ai/agents', async (ctx) => {
      requireAdmin(await resolveActor(ctx));
      return state.agents.insert((await ctx.json()) || {});
    });
    router.register('POST', '/api/ai/agents/:id/chat', async (ctx) => {
      const body = (await ctx.json()) || {};
      return agentChat(ctx, body.messages || [], body.threadId, false);
    });
    router.register('GET', '/api/ai/agents/:id/chat', (ctx) => {
      let messages: any[] = [];
      try {
        messages = JSON.parse(ctx.query.get('messages') || '[]');
      } catch {}
      if (!lastUserMessage(messages) && ctx.query.get('message')) messages = [{ role: 'user', content: ctx.query.get('message') }];
      return agentChat(ctx, messages, ctx.query.get('threadId'), true);
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
        const thread = completionThread(ctx, ctx.params.id);
        if (thread instanceof Response) return thread;
        return respond(ctx.params.id, body.messages || [], stream, { threadId: thread, clientTools: body.clientTools });
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
