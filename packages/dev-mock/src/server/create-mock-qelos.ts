import type { MockQelosOptions } from '../config/types.js';
import { validateMockConfig } from '../config/resolve.js';
import { assertMockAllowed, mockBanner } from '../guard/production-guard.js';
import { jsonResponse, Router, type RouteModule } from '../router/router.js';
import { authRoutes } from '../routes/auth-routes.js';
import { MockState } from '../state/mock-state.js';

export interface CreateMockQelosOptions extends MockQelosOptions {
  /** extra route modules; registered before the built-in auth routes so they can override them */
  routes?: RouteModule[];
}

export interface MockQelos {
  handle(request: Request): Promise<Response>;
  state: MockState;
  router: Router;
  fetch: typeof fetch;
}

const BASE_URL = 'http://qelos.mock';

export function createMockQelos(options: CreateMockQelosOptions = {}): MockQelos {
  const { routes = [], ...rest } = options;
  const config = validateMockConfig(rest);
  const env = config.env ?? process.env;
  assertMockAllowed(config, env);
  if (config.enabled) (config.logger ?? console.warn)(mockBanner(config));

  const state = new MockState({
    dataDir: config.dataDir,
    persist: config.persist,
    seed: config.seed,
    persistDebounceMs: config.persistDebounceMs,
    defaultPersona: config.defaultPersona,
    tenantId: String(config.tenant?._id ?? config.tenant?.id ?? '0'),
    auth: config.auth,
  });
  const router = new Router();
  // custom modules first so they can override the built-in ones
  for (const module of [...routes, authRoutes]) router.use(module, state);

  async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    let cached: Promise<any> | undefined;
    try {
      const res = await router.dispatch({
        request,
        url,
        query: url.searchParams,
        state,
        json: () =>
          (cached ??= request
            .clone()
            .text()
            .then((t) => (t ? JSON.parse(t) : undefined))),
      });
      if (res) return res;
    } catch (e: any) {
      const bad = e instanceof SyntaxError;
      return jsonResponse(
        { code: bad ? 'QELOS_MOCK_BAD_REQUEST' : 'QELOS_MOCK_ERROR', message: e?.message || 'Mock error' },
        bad ? 400 : 500,
      );
    }
    return jsonResponse(
      {
        code: 'QELOS_MOCK_NOT_IMPLEMENTED',
        message: `Mock Qelos API does not implement ${request.method} ${url.pathname}`,
      },
      404,
    );
  }

  const mockFetch = ((input: any, init?: RequestInit) => {
    const base = config.tenant?.appUrl || BASE_URL;
    let request: Request;
    if (input instanceof Request && !init) request = input;
    else if (typeof input === 'string' || input instanceof URL) request = new Request(new URL(String(input), base), init);
    else request = new Request(input, init);
    return handle(request);
  }) as typeof fetch;

  return { handle, state, router, fetch: mockFetch };
}
