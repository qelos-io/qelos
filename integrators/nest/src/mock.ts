import type { QelosNestConfig } from './types';

/**
 * Minimal structural types so this package's typings don't require the
 * optional `@qelos/testing` peer to be installed.
 */
export interface MockQelosOptions {
  enabled?: boolean;
  dataDir?: string;
  artifactsDir?: string;
  allowInProduction?: boolean;
  [key: string]: unknown;
}

export interface MockQelos {
  handle(request: Request): Promise<Response>;
  fetch: typeof fetch;
  /** Live mock state (see `MockState` in `@qelos/testing`). */
  state: any;
  [key: string]: any;
}

interface TestingModule {
  createMockQelos(options: MockQelosOptions): MockQelos;
  resolveMockConfig(env: Record<string, string | undefined>, explicit?: MockQelosOptions): MockQelosOptions;
}

/** Placeholder origin used for SDK/`/api/me` calls that are served by the mock. */
export const MOCK_APP_URL = 'http://qelos-mock.local';

const FALSE_VALUES = new Set(['', '0', 'false', 'no', 'off']);

export interface QelosMockController {
  /** True when mock mode is requested and allowed (synchronous decision). */
  readonly active: boolean;
  /** Lazily creates (once) and returns the mock instance, or `null` when inactive. */
  get(): Promise<MockQelos | null>;
  /** `fetch` bound to the lazily created mock. */
  readonly fetch: typeof globalThis.fetch;
}

function envMockEnabled(env: NodeJS.ProcessEnv): boolean {
  const raw = env.QELOS_MOCK?.trim();
  if (raw === undefined) return false;
  return !FALSE_VALUES.has(raw.toLowerCase()); // truthy word or a folder path
}

function explicitOptions(mock: QelosNestConfig['mock']): MockQelosOptions {
  if (typeof mock === 'string') return { dataDir: mock, enabled: true };
  if (mock && typeof mock === 'object') return mock;
  if (mock === true) return { enabled: true };
  return {};
}

function isRequested(config: QelosNestConfig, env: NodeJS.ProcessEnv): boolean {
  const { mock } = config;
  if (mock === false) return false;
  if (mock === undefined) return envMockEnabled(env);
  if (typeof mock === 'object' && mock !== null) return mock.enabled !== false;
  return !!mock;
}

async function loadTesting(): Promise<TestingModule> {
  try {
    return (await import('@qelos/testing' as string)) as TestingModule;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
      throw new Error(
        '[@qelos/integrator-nest] Qelos mock mode was requested (config.mock / QELOS_MOCK) ' +
          'but "@qelos/testing" is not installed. Install it as a dev dependency: ' +
          'npm i -D @qelos/testing',
      );
    }
    throw err;
  }
}

function createController(config: QelosNestConfig): QelosMockController {
  const env = process.env;
  let active = isRequested(config, env);
  if (active && env.NODE_ENV === 'production') {
    const allow =
      typeof config.mock === 'object' && config.mock !== null && config.mock.allowInProduction === true;
    if (!allow) {
      console.warn(
        '[@qelos/integrator-nest] Qelos mock mode is ignored because NODE_ENV=production. ' +
          'Set `mock: { allowInProduction: true }` to force it (not recommended).',
      );
      active = false;
    }
  }

  if (active) {
    const prod = env.NODE_ENV === 'production';
    console.warn(
      '\n' +
        '============================================================\n' +
        '[@qelos/integrator-nest] QELOS MOCK MODE IS ACTIVE\n' +
        '  /api/** and request.qelos are served by a local mock, not a real Qelos tenant.\n' +
        (prod ? '  WARNING: running in production (allowInProduction) - mock replaces real auth!\n' : '') +
        '============================================================\n',
    );
  }

  let instance: Promise<MockQelos> | undefined;
  const create = (): Promise<MockQelos> =>
    (instance ??= loadTesting()
      .then((mod) => mod.createMockQelos({ ...mod.resolveMockConfig(env, explicitOptions(config.mock)), enabled: true }))
      .catch((err) => {
        instance = undefined; // allow retry after e.g. installing the package
        throw err;
      }));

  const lazyFetch = ((input: any, init?: RequestInit) =>
    create().then((m) => m.fetch(input, init))) as typeof globalThis.fetch;

  return {
    active,
    get: async () => (active ? create() : null),
    fetch: lazyFetch,
  };
}

const controllers = new Map<string, QelosMockController>();
const fnIds = new WeakMap<object, number>();
let fnCounter = 0;

function controllerKey(config: QelosNestConfig): string {
  return JSON.stringify(
    {
      mock: config.mock ?? null,
      env: process.env.QELOS_MOCK ?? null,
      node: process.env.NODE_ENV ?? null,
    },
    (_k, v) => {
      if (typeof v !== 'function') return v;
      if (!fnIds.has(v)) fnIds.set(v, ++fnCounter);
      return `fn#${fnIds.get(v)}`;
    },
  );
}

/**
 * Returns the mock controller for a config. Controllers are shared by the
 * resolved mock options (not config object identity), so the middleware,
 * proxy and SDK share one mock (and its state) whenever they are configured
 * with structurally equal mock options.
 */
export function getQelosMock(config: QelosNestConfig): QelosMockController {
  const key = controllerKey(config);
  let controller = controllers.get(key);
  if (!controller) {
    controller = createController(config);
    controllers.set(key, controller);
  }
  return controller;
}

