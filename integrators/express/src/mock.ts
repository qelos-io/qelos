import type { QelosExpressConfig } from './types';

/**
 * Minimal structural types so this package's typings don't require the
 * optional `@qelos/dev-mock` peer to be installed.
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
  /** Live mock state (see `MockState` in `@qelos/dev-mock`). */
  state: any;
  [key: string]: any;
}

interface DevMockModule {
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

function explicitOptions(mock: QelosExpressConfig['mock']): MockQelosOptions {
  if (typeof mock === 'string') return { dataDir: mock, enabled: true };
  if (mock && typeof mock === 'object') return mock;
  if (mock === true) return { enabled: true };
  return {};
}

function isRequested(config: QelosExpressConfig, env: NodeJS.ProcessEnv): boolean {
  const { mock } = config;
  if (mock === false) return false;
  if (mock === undefined) return envMockEnabled(env);
  if (typeof mock === 'object' && mock !== null) return mock.enabled !== false;
  return !!mock;
}

async function loadDevMock(): Promise<DevMockModule> {
  try {
    return (await import('@qelos/dev-mock' as string)) as DevMockModule;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
      throw new Error(
        '[@qelos/integrator-express] Qelos mock mode was requested (config.mock / QELOS_MOCK) ' +
          'but "@qelos/dev-mock" is not installed. Install it as a dev dependency: ' +
          'npm i -D @qelos/dev-mock',
      );
    }
    throw err;
  }
}

function createController(config: QelosExpressConfig): QelosMockController {
  const env = process.env;
  let active = isRequested(config, env);
  if (active && env.NODE_ENV === 'production') {
    const allow =
      typeof config.mock === 'object' && config.mock !== null && config.mock.allowInProduction === true;
    if (!allow) {
      console.warn(
        '[@qelos/integrator-express] Qelos mock mode is ignored because NODE_ENV=production. ' +
          'Set `mock: { allowInProduction: true }` to force it (not recommended).',
      );
      active = false;
    }
  }

  let instance: Promise<MockQelos> | undefined;
  const create = (): Promise<MockQelos> =>
    (instance ??= loadDevMock()
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

const controllers = new WeakMap<QelosExpressConfig, QelosMockController>();

/**
 * Returns the mock controller for a config (one per config object, so the
 * middleware, proxy and SDK built from the same config share one mock).
 */
export function getQelosMock(config: QelosExpressConfig): QelosMockController {
  let controller = controllers.get(config);
  if (!controller) {
    controller = createController(config);
    controllers.set(config, controller);
  }
  return controller;
}

/** Make `derived` share the mock controller of `source`. */
export function shareQelosMock(source: QelosExpressConfig, derived: QelosExpressConfig): void {
  controllers.set(derived, getQelosMock(source));
}
