import { jsonResponse, type RouteContext, type Router } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { authenticate } from '../auth/authenticate.js';

/**
 * `sdk.drafts`, following `apps/drafts`: every signed-in user keeps their own drafts, one per `contextType` and
 * `contextId`. `getList` asks for `GET /api/drafts` without a context, which the service answers like one draft:
 * `404` unless a draft was saved without a `contextType`.
 */
export function draftRoutes(router: Router, state: MockState) {
  const drafts = () => state.collection('drafts');
  const route = (method: 'GET' | 'PUT' | 'DELETE', path: string, handler: (ctx: RouteContext, user: string) => unknown) =>
    router.register(method, path, (ctx) => {
      const auth = authenticate(ctx.request, state);
      return auth ? handler(ctx, auth.user._id) : new Response(null, { status: 401 });
    });
  const find = (user: string, contextType: unknown, contextId: unknown): Doc | undefined =>
    drafts().findOne((d) => d.user === user && (d.contextType ?? null) === (contextType ?? null) && (d.contextId ?? null) === contextId);

  route('GET', '/api/drafts/all', (_ctx, user) => drafts().list((d) => d.user === user));

  route('GET', '/api/drafts', ({ query }, user) => {
    const draft = find(user, query.get('contextType'), query.get('contextId') || null);
    return draft ?? jsonResponse({ message: 'draft not found' }, 404);
  });

  // creates the draft of a context, or replaces its content
  route('PUT', '/api/drafts', async (ctx, user) => {
    const { contextType, contextId = null, contextData = {}, contextDisplayName = '', contextRouteParams = {} } = (await ctx.json()) ?? {};
    const content = { contextData, contextDisplayName, contextRouteParams };
    const existing = find(user, contextType, contextId);
    if (existing) return drafts().update(existing._id, content);
    return drafts().insert({ user, tenant: state.settings.tenantId, contextType: contextType ?? null, contextId, ...content, __v: 0 });
  });

  route('DELETE', '/api/drafts', ({ query }, user) => {
    const draft = find(user, query.get('contextType'), query.get('contextId'));
    if (draft) drafts().remove(draft._id);
    return { success: true };
  });
}
