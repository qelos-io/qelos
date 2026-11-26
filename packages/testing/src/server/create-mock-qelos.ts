import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { MockQelosOptions } from '../config/types.js';
import { validateMockConfig } from '../config/resolve.js';
import { assertMockAllowed, mockBanner } from '../guard/production-guard.js';
import { jsonResponse, MockHttpError, Router, type HttpMethod, type RouteHandler, type RouteModule } from '../router/router.js';
import { authRoutes } from '../routes/auth-routes.js';
import { MockState } from '../state/mock-state.js';
import { importQelosArtifacts } from '../importers/qelos-artifacts.js';
import { createActorResolver, createDefaultAuthenticate, type Authenticate } from '../routes/actor.js';
import { entitiesRoutes } from '../routes/entities.js';
import { contentRoutes } from '../routes/content.js';
import { stubRoutes } from '../routes/stubs.js';
import { userRoutes } from '../routes/users.js';
import { threadRoutes } from '../routes/threads.js';
import { paymentRoutes } from '../routes/payments.js';
import { eventRoutes } from '../routes/events.js';
import { ragRoutes } from '../routes/rag.js';
import { integrationRoutes } from '../routes/integrations.js';
import { pluginRoutes } from '../routes/plugins.js';
import { scriptRoutes } from '../routes/scripts.js';
import { draftRoutes } from '../routes/drafts.js';
import { createPaymentsControls, type PaymentsControls } from '../payments/controls.js';
import { managementRoutes } from '../routes/management.js';
import { loadCassette, type Cassette, type CassetteExchange } from '../cassette/index.js';
import { createAiStub, type AiStub } from '../ai/ai-stub.js';
import { createFaultInjector, type FaultInjector } from '../faults/faults.js';

export interface CreateMockQelosOptions extends MockQelosOptions {
  /** extra route modules; registered before the built-in auth routes so they can override them */
  routes?: RouteModule[];
  /**
   * Resolve the caller of a request (return `null` for "no identity": permissions are then not enforced).
   * Default (`createDefaultAuthenticate`): the `x-qelos-mock-persona` header or cookie, then the signed-in user
   * (API token, session cookie or bearer token), then `defaultPersona`. See also `strictPermissions`.
   */
  authenticate?: Authenticate;
  /** Called for requests no route handles. Return a Response to answer, or nothing to fall through to the 404. */
  onMissing?: (request: Request) => Response | void | Promise<Response | void>;
  /**
   * Answer requests no route handles from a recorded cassette (a `cassette.jsonl` file, its folder, or exchanges).
   * Everything the mock implements itself still comes from the mock. `onMissing` runs only for cassette misses.
   */
  cassette?: string | CassetteExchange[] | Cassette;
  /** Register the built-in Qelos API routes (blueprints, entities, content, stubs). Default true. */
  builtinRoutes?: boolean;
}

export interface MockQelos {
  handle(request: Request): Promise<Response>;
  state: MockState;
  router: Router;
  /** Fault injection for resilience tests: `mock.faults.fail('GET /api/me', 503)`. */
  faults: FaultInjector;
  /** Scripted AI replies and recorded calls: `mock.ai.reply(/refund/, 'Done')`, `mock.ai.calls`. */
  ai: AiStub;
  /** Report payment results, as the provider would: `mock.payments.pay(subscriptionId)`, `fail`, `cancel`. */
  payments: PaymentsControls;
  fetch: typeof fetch;
  /** Register a handler that takes precedence over every other route, e.g. `mock.on('GET', '/api/foo', () => ({ ok: true }))`. */
  on(method: HttpMethod, pattern: string, handler: RouteHandler): MockQelos;
}

const BASE_URL = 'http://qelos.mock';

/** `<dataDir>/personas.json` (created by `qelos mock init`): an array of personas merged under the explicit `seed.personas`. */
function withPersonasFile<T extends { dataDir?: string; seed?: any }>(config: T): T {
  if (!config.dataDir) return config;
  const file = join(resolve(config.dataDir), 'personas.json');
  if (!existsSync(file)) return config;
  let fromFile: unknown;
  try {
    fromFile = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e: any) {
    throw new Error(`@qelos/testing: failed to read ${file}: ${e.message}`);
  }
  if (!Array.isArray(fromFile)) throw new Error(`@qelos/testing: ${file} must be a JSON array of personas`);
  fromFile.forEach((p: any, i) => {
    if (!p || typeof p !== 'object' || typeof p.email !== 'string' || !p.email) {
      throw new Error(`@qelos/testing: ${file}: persona at index ${i} must be an object with a string "email"`);
    }
  });
  const explicit: any[] = config.seed?.personas || [];
  const emails = new Set(explicit.map((p) => (typeof p?.email === 'string' ? p.email.toLowerCase() : '')));
  const personas = [...(fromFile as any[]).filter((p) => !emails.has(p.email.toLowerCase())), ...explicit];
  return { ...config, seed: { ...config.seed, personas } };
}

export function createMockQelos(options: CreateMockQelosOptions = {}): MockQelos {
  const { routes = [], authenticate, onMissing: userOnMissing, builtinRoutes = true, cassette: cassetteSource, ...rest } = options;
  const cassette = cassetteSource && typeof cassetteSource === 'object' && !Array.isArray(cassetteSource) ? cassetteSource : cassetteSource ? loadCassette(cassetteSource) : undefined;
  const onMissing: CreateMockQelosOptions['onMissing'] = cassette
    ? async (request) => {
        const res = await cassette.respond(request.clone());
        if (!res.headers.has('x-qelos-cassette-miss') || !userOnMissing) return res;
        return (await userOnMissing(request)) ?? res;
      }
    : userOnMissing;
  const config = validateMockConfig(withPersonasFile(rest));
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
  // import `qelos pull`/`qelos dump` output on first start (persisted state wins afterwards) or when asked to
  const artifactsDir = config.artifactsDir ?? config.dataDir;
  if (artifactsDir && (!state.restored || config.reimport)) {
    const log = config.logger ?? console.warn;
    importQelosArtifacts(artifactsDir, state, {
      onConflict: config.onConflict,
      warn: (m) => log(`[qelos-testing] ${m}`),
    });
  }
  const faults = createFaultInjector(state);
  const ai = createAiStub();
  const router = new Router();
  // custom modules first so they can override the built-in ones
  for (const module of [...routes, authRoutes]) router.use(module, state);
  for (const module of routes) router.use(module, state);
  if (builtinRoutes) {
    const resolveActor = createActorResolver(
      authenticate ?? createDefaultAuthenticate(config.defaultPersona, { strict: config.strictPermissions }),
    );
    for (const module of [entitiesRoutes({ resolveActor }), contentRoutes({ resolveActor }), stubRoutes({ resolveActor, ai }), userRoutes, threadRoutes, paymentRoutes, eventRoutes, ragRoutes({ resolveActor }), integrationRoutes({ resolveActor }), pluginRoutes({ resolveActor }), scriptRoutes({ resolveActor }), draftRoutes]) {
      router.use(module, state);
    }
  }
  // dev-only state API: not mounted when the mock is disabled
  if (config.enabled) router.use(managementRoutes, state);


  async function handle(request: Request): Promise<Response> {
    const injected = await faults.intercept(request);
    if (injected) return injected;
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
    faults,
    ai,
    payments: createPaymentsControls(state),
    fetch: mockFetch,
    on(method, pattern, handler) {
      router.prepend(method, pattern, handler);
      return mock;
    },
  };
  return mock;
}
