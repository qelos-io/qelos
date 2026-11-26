import { jsonResponse, MockHttpError, type RouteContext, type Router } from '../router/router.js';
import type { Doc, MockState } from '../state/mock-state.js';
import { authenticate, type AuthContext } from '../auth/authenticate.js';
import { isPrivilegedUser } from '../auth/accounts.js';

/**
 * Platform events (`sdk.events` of the administrator SDK), following `apps/plugins`: administrators read them,
 * administrators and plugins dispatch them. A refused caller gets an empty `401`.
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const TOTAL_CAP = 10000;
const DAY = 24 * 60 * 60 * 1000;
const FIELDS = ['user', 'workspace', 'source', 'kind', 'eventName', 'description', 'metadata', 'created'];
/** endpoints of the service the mock does not implement; they must not be read as event ids */
const NOT_IMPLEMENTED = ['filter-options', 'count', 'overview', 'sum'];

/** The start of a `period`; null for `all-time`. Unknown values mean the last week. */
function periodStart(period: string): number | null {
  if (period === 'all-time') return null;
  const date = new Date();
  if (period === 'last-day') return date.getTime() - DAY;
  if (period === 'last-month') return date.setMonth(date.getMonth() - 1);
  if (period === 'last-year') return date.setFullYear(date.getFullYear() - 1);
  return date.getTime() - 7 * DAY;
}

/** a seeded event without a date counts as just created */
const createdAt = (event: Doc) => (event.created ? new Date(event.created).getTime() : Date.now());

function filter(query: URLSearchParams): (event: Doc) => boolean {
  const exact = ['kind', 'eventName', 'source']
    .map((key) => [key, query.get(key) ?? '*'] as const)
    .filter(([, value]) => value !== '*');
  const user = query.get('user');
  const workspace = query.get('workspace');
  const search = query.get('search')?.toLowerCase();
  const from = query.get('from');
  const to = query.get('to');
  const since = from || to ? (from ? new Date(from).getTime() : null) : periodStart(query.get('period') ?? 'last-week');
  const until = to ? new Date(to).getTime() : null;

  return (event) =>
    exact.every(([key, value]) => String(event[key]) === value) &&
    (!user || event.user === user) &&
    (!workspace ||
      [event.workspace, event.metadata?.workspace, event.metadata?.workspace?._id, event.metadata?.workspaceId].includes(workspace)) &&
    (!search || JSON.stringify(event).toLowerCase().includes(search)) &&
    (since === null || createdAt(event) >= since) &&
    (until === null || createdAt(event) <= until);
}

export function eventRoutes(router: Router, state: MockState) {
  const allowed = (may: (auth: AuthContext) => boolean, handler: (ctx: RouteContext, auth: AuthContext) => unknown) => (ctx: RouteContext) => {
    const auth = authenticate(ctx.request, state);
    return auth && may(auth) ? handler(ctx, auth) : new Response(null, { status: 401 });
  };
  const admin = (auth: AuthContext) => isPrivilegedUser(auth.user);
  const isPlugin = (auth: AuthContext) => !!auth.user.roles?.includes('plugin');

  router.register('GET', '/api/events', allowed(admin, ({ query }) => {
    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(query.get('limit') ?? undefined) || DEFAULT_LIMIT));
    const page = Number(query.get('page')) || 0;
    const matching = state.events.list(filter(query)).sort((a, b) => createdAt(b) - createdAt(a));
    const total = Math.min(matching.length, TOTAL_CAP);
    const skip = Math.max(0, page * limit);
    return {
      events: matching.slice(skip, skip + limit),
      total,
      totalCapped: matching.length > TOTAL_CAP || undefined,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }));

  router.register('GET', '/api/events/:eventId', allowed(admin, ({ params }) => {
    if (NOT_IMPLEMENTED.includes(params.eventId)) {
      throw new MockHttpError(404, `Mock Qelos API does not implement GET /api/events/${params.eventId}`, 'QELOS_MOCK_NOT_IMPLEMENTED');
    }
    return jsonResponse(state.events.get(params.eventId) ?? null);
  }));

  // like the service, answer 200 with no body, and drop an event it could not store
  router.register('POST', '/api/events', allowed((auth) => admin(auth) || isPlugin(auth), async (ctx, auth) => {
    const body = (await ctx.json()) ?? {};
    const event: Record<string, any> = Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));
    if (event.source && isPlugin(auth) && !String(event.source).startsWith('plugin:')) event.source = `plugin:${event.source}`;
    if (event.source && event.kind && event.eventName) {
      state.events.insert({ metadata: {}, created: new Date().toISOString(), ...event, tenant: state.settings.tenantId });
    }
    return new Response(null, { status: 200 });
  }));
}
