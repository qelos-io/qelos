import type { MockQelosOptions } from '../config/types.js';
import { validateMockConfig } from '../config/resolve.js';
import { assertMockAllowed, mockBanner } from '../guard/production-guard.js';
import { jsonResponse, MockHttpError, Router, type HttpMethod, type RouteHandler, type RouteModule } from '../router/router.js';
import { MockState } from '../state/mock-state.js';
import { importQelosArtifacts } from '../importers/qelos-artifacts.js';
import { createActorResolver, createDefaultAuthenticate, type Authenticate } from '../routes/actor.js';
import { entitiesRoutes } from '../routes/entities.js';
import { contentRoutes } from '../routes/content.js';
import { stubRoutes } from '../routes/stubs.js';
import { managementRoutes } from '../routes/management.js';

export interface CreateMockQelosOptions extends MockQelosOptions {
  /** route modules (auth, entities, ...) registered on the router */
  routes?: RouteModule[];
  /**
   * Resolve the caller of a request (return `null` for "no identity": permissions are then not enforced).
   * Default: the `x-qelos-mock-persona` header, then `defaultPersona`.
   */
  authenticate?: Authenticate;
  /** Called for requests no route handles. Return a Response to answer, or nothing to fall through to the 404. */
  onMissing?: (request: Request) => Response | void | Promise<Response | void>;
  /** Register the built-in Qelos API routes (blueprints, entities, content, stubs). Default true. */
  builtinRoutes?: boolean;
}

export interface MockQelos {
  handle(request: Request): Promise<Response>;
  state: MockState;
  router: Router;
  fetch: typeof fetch;
  /** Register a handler that takes precedence over every other route, e.g. `mock.on('GET', '/api/foo', () => ({ ok: true }))`. */
  on(method: HttpMethod, pattern: string, handler: RouteHandler): MockQelos;
}

const BASE_URL = 'http://qelos.mock';

export function createMockQelos(options: CreateMockQelosOptions = {}): MockQelos {
  const { routes = [], authenticate, onMissing, builtinRoutes = true, ...rest } = options;
  const config = validateMockConfig(rest);
  const env = config.env ?? process.env;
  assertMockAllowed(config, env);
  if (config.enabled) (config.logger ?? console.warn)(mockBanner(config));

  const state = new MockState({
    dataDir: config.dataDir,
    persist: config.persist,
    seed: config.seed,
    persistDebounceMs: config.persistDebounceMs,
  });
  // import `qelos pull`/`qelos dump` output on first start (persisted state wins afterwards) or when asked to
  const artifactsDir = config.artifactsDir ?? config.dataDir;
  if (artifactsDir && (!state.restored || config.reimport)) {
    const log = config.logger ?? console.warn;
    importQelosArtifacts(artifactsDir, state, {
      onConflict: config.onConflict,
      warn: (m) => log(`[qelos-dev-mock] ${m}`),
    });
  }
  const router = new Router();
  for (const module of routes) router.use(module, state);
  if (builtinRoutes) {
    const resolveActor = createActorResolver(authenticate ?? createDefaultAuthenticate(config.defaultPersona));
    for (const module of [entitiesRoutes({ resolveActor }), contentRoutes({ resolveActor }), stubRoutes({ resolveActor })]) {
      router.use(module, state);
    }
  }
  // dev-only state API: not mounted when the mock is disabled
  if (config.enabled) router.use(managementRoutes, state);

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
      if (e instanceof MockHttpError) {
        return jsonResponse({ message: e.message, ...(e.code ? { code: e.code } : {}) }, e.status);
      }
      const bad = e instanceof SyntaxError;
      return jsonResponse(
        { code: bad ? 'QELOS_MOCK_BAD_REQUEST' : 'QELOS_MOCK_ERROR', message: e?.message || 'Mock error' },
        bad ? 400 : 500,
      );
    }
    if (onMissing) {
      try {
        const res = await onMissing(request);
        if (res) return res;
      } catch (e: any) {
        return jsonResponse({ code: 'QELOS_MOCK_ERROR', message: e?.message || 'Mock error' }, 500);
      }
    }
    return jsonResponse(
      {
        code: 'QELOS_MOCK_NOT_IMPLEMENTED',
        message: `Mock Qelos API does not implement ${request.method} ${url.pathname}`,
        method: request.method,
        path: url.pathname,
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

  const mock: MockQelos = {
    handle,
    state,
    router,
    fetch: mockFetch,
    on(method, pattern, handler) {
      router.prepend(method, pattern, handler);
      return mock;
    },
  };
  return mock;
}
