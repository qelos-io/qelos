import { jsonResponse, type RouteContext, type Router } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { authenticate, type AuthContext } from '../auth/authenticate.js';
import { isPrivilegedUser } from '../auth/accounts.js';
import { isValidId } from '../state/ids.js';
import { newThread, ownsThread } from '../ai/threads.js';
import { wantsBypassAdmin } from './actor.js';
import { findAgent, listAgents } from '../ai/agents.js';

/** `sdk.ai.threads`, following `apps/ai/server/controllers/threads.ts`. */

export function threadRoutes(router: Router, state: MockState) {
  const threads = () => state.collection('threads');
  const error = (message: string, status: number) => jsonResponse({ error: message }, status);

  /** the thread of the request, when the caller may access it: their own, or any for a privileged caller */
  function load(ctx: RouteContext, auth: AuthContext): Doc | Response {
    const { threadId } = ctx.params;
    if (!isValidId(threadId)) return error('Valid thread ID is required', 400);
    const thread = threads().get(threadId);
    const privileged = isPrivilegedUser(auth.user) && !wantsBypassAdmin(ctx);
    if (!thread || (!privileged && !ownsThread(thread, auth))) return error('Thread not found', 404);
    return thread;
  }

  router.register('POST', '/api/ai/threads', async (ctx) => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return error('Unauthorized', 401);
    const { integration } = (await ctx.json()) ?? {};
    if (typeof integration !== 'string' || !integration) return error('Valid integration ID is required', 400);
    // with no agents in the mock, any id is accepted; once some are seeded the id has to be one of them
    const agent = findAgent(state, integration);
    if (listAgents(state).length && (!agent || agent.active === false)) return error('Integration not found', 404);
    return jsonResponse(newThread(state, integration, auth), 201);
  });

  router.register('GET', '/api/ai/threads', (ctx) => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return error('Authentication required', 401);
    const privileged = isPrivilegedUser(auth.user) && !wantsBypassAdmin(ctx);
    const wanted = (key: string, value: unknown) => !ctx.query.get(key) || ctx.query.get(key) === value;
    const list = threads().list((t) =>
      privileged
        ? wanted('user', t.user) && wanted('workspace', t.workspace) && wanted('integration', t.integration)
        : ownsThread(t, auth) && wanted('integration', t.integration),
    );
    const sort = ctx.query.get('sort') || '-updated';
    const field = sort.replace(/^-/, '');
    const direction = sort.startsWith('-') ? -1 : 1;
    list.sort((a, b) => direction * String(a[field] ?? '').localeCompare(String(b[field] ?? '')));
    // `limit` is accepted and, like in the service today, not applied. The list carries no messages.
    return list.map(({ messages: _messages, ...thread }) => thread);
  });

  router.register('GET', '/api/ai/threads/:threadId', (ctx) => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return error('Unauthorized', 401);
    return load(ctx, auth);
  });

  router.register('DELETE', '/api/ai/threads/:threadId', (ctx) => {
    const auth = authenticate(ctx.request, state);
    if (!auth) return error('Authentication required', 401);
    const thread = load(ctx, auth);
    if (thread instanceof Response) return thread;
    threads().remove(thread._id);
    return { message: 'Thread deleted successfully' };
  });
}
