import { jsonResponse, MockHttpError, type RouteContext, type RouteModule } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { isSignedIn, mayAct, type ActorResolver, type MockActor } from './actor.js';
import { agentCollection, agentIntegration, agentRefusal, findAgent, listAgents, toAgent } from '../ai/agents.js';
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

function webhookRefusal(actor: MockActor | null, hit: Doc | undefined): string | undefined {
  if (!actor || !hit) return undefined;
  const roles: string[] = [...actor.roles, ...(actor.workspace?.roles ?? [])];
  if (hit.roles?.length && !hit.roles.some((role: string) => role === 'guest' || roles.includes(role))) {
    return 'Access denied: insufficient permissions';
  }
  const labels: string[] = actor.workspace?.labels ?? [];
  if (hit.workspaceLabels?.length && !hit.workspaceLabels.every((label: string) => labels.includes(label))) {
    return 'Access denied: missing required workspace labels';
  }
  return undefined;
}

/** Deterministic stubs for the services an app normally proxies: AI and lambdas. */
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
      const agent = findAgent(state, agentId);
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

    const unauthorized = () => new Response(null, { status: 401 });
    const refused = (text: string) => jsonResponse({ message: text }, 403);

    async function agentChat(ctx: RouteContext, messages: any[], threadId: unknown, stream: boolean) {
      const actor = await resolveActor(ctx);
      if (!isSignedIn(actor)) return unauthorized();
      const id = ctx.params.id;
      const agent = findAgent(state, id);
      // with no agents in the mock, any id answers; once there are some the id has to be one of them
      if (listAgents(state).length && (!agent || agent.active === false)) {
        return jsonResponse({ message: 'Agent not found' }, 404);
      }
      const refusal = agentRefusal(actor, agent);
      if (refusal) return refused(refusal);
      if (!messages.length) return jsonResponse({ message: 'messages are required' }, 400);
      const thread = agentThread(ctx, id, threadId);
      if (thread instanceof Response) return thread;
      return respond(id, messages, stream, { threadId: thread });
    }

    // ---- AI agents (seeded in `agents`) + chat completions
    // The service stores agents as integrations, which only administrators and plugins may manage
    const AGENT_MANAGERS = ['admin', 'plugin'];
    const failed = (text: string, status: number) => jsonResponse({ message: text }, status);
    const manage = (refusal: () => Response, handler: (ctx: RouteContext, actor: MockActor | null) => unknown) => async (ctx: RouteContext) => {
      const actor = await resolveActor(ctx);
      if (!isSignedIn(actor)) return unauthorized();
      return mayAct(actor, AGENT_MANAGERS) ? handler(ctx, actor) : refusal();
    };
    /** an agent by the id of the request, answering 404 with the failure message of the action */
    const existing = (failure: string, handler: (agent: Doc, ctx: RouteContext) => unknown) =>
      manage(() => failed(failure, 401), (ctx) => {
        const agent = findAgent(state, ctx.params.id);
        return agent ? handler(agent, ctx) : failed(failure, 404);
      });

    router.register('GET', '/api/ai/agents', manage(() => failed('Failed to list agents', 500), ({ query }) => {
      const active = query.get('active');
      return listAgents(state).map(toAgent).filter((a) => active === null || a.active === ['true', '1'].includes(active));
    }));
    router.register('POST', '/api/ai/agents', async (ctx) => {
      const actor = await resolveActor(ctx);
      if (!isSignedIn(actor)) return unauthorized();
      const payload = (await ctx.json()) || {};
      if (!payload.name) return failed('name is required', 400);
      if (!payload.triggerSource || !payload.targetSource) return failed('triggerSource and targetSource are required', 400);
      if (!mayAct(actor, AGENT_MANAGERS)) return failed('Failed to create agent', 401);
      const agent = state.agents.insert({
        ...agentIntegration(payload),
        active: payload.active !== false,
        tenant: state.settings.tenantId,
        created: new Date().toISOString(),
      });
      return jsonResponse(toAgent(agent), 201);
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
    router.register('GET', '/api/ai/agents/:id', existing('Failed to get agent', toAgent));
    router.register('PUT', '/api/ai/agents/:id', existing('Failed to update agent', async (agent, ctx) => {
      const payload = (await ctx.json()) || {};
      const changes = { ...agentIntegration(payload, agent), ...(payload.active !== undefined ? { active: payload.active } : {}) };
      return toAgent(agentCollection(state, agent._id).update(agent._id, changes)!);
    }));
    router.register('DELETE', '/api/ai/agents/:id', existing('Failed to delete agent', (agent) => {
      agentCollection(state, agent._id).remove(agent._id);
      return { success: true, message: 'Agent deleted' };
    }));
    for (const path of ['/api/ai/:id/chat-completion', '/api/ai/:id/chat-completion/:threadId']) {
      router.register('POST', path, async (ctx) => {
        const body = (await ctx.json()) || {};
        // like the service: stream when asked in the query or through the accept header
        const stream = ctx.query.get('stream') === 'true' || (ctx.request.headers.get('accept') ?? '').includes('text/event-stream');
        const thread = completionThread(ctx, ctx.params.id);
        if (thread instanceof Response) return thread;
        const refusal = agentRefusal(await resolveActor(ctx), findAgent(state, ctx.params.id));
        if (refusal) return refused(refusal);
        return respond(ctx.params.id, body.messages || [], stream, { threadId: thread, clientTools: body.clientTools });
      });
    }

    // ---- lambdas / integration triggers: seeded `{ integrationId, method?, response, status? }` or `{}`
    // like the service: a signed-in caller, who also has the roles and workspace labels the seeded entry asks for
    router.register('*', '/api/webhooks/:id', async (ctx) => {
      const actor = await resolveActor(ctx);
      if (!isSignedIn(actor)) return unauthorized();
      const method = ctx.request.method.toUpperCase();
      const hit: Doc | undefined = state.lambdas.findOne(
        (l) => l.integrationId === ctx.params.id && (!l.method || String(l.method).toUpperCase() === method),
      );
      const refusal = webhookRefusal(actor, hit);
      if (refusal) return refused(refusal);
      return new Response(JSON.stringify(hit ? (hit.response ?? {}) : {}), {
        status: Number(hit?.status) || 200,
        headers: { 'content-type': 'application/json' },
      });
    });
  };
}
