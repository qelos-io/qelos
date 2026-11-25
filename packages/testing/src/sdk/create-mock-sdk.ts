import * as sdkModule from '@qelos/sdk';
import { createMockQelos, type CreateMockQelosOptions, type MockQelos } from '../server/create-mock-qelos.js';
import { PERSONA_HEADER } from '../routes/actor.js';

// the SDK build is CommonJS: the class sits on `default` (twice, depending on the loader)
const sdkExports: any = sdkModule;
const QelosSDKClass: new (options: any) => QelosSDK = sdkExports.default?.default ?? sdkExports.default ?? sdkExports;

export type QelosSDK = InstanceType<typeof sdkModule.default.default>;

const APP_URL = 'http://qelos.mock';

export interface CreateMockSdkOptions extends CreateMockQelosOptions {
  /**
   * Act as this persona (id or email) from the first call, with no sign-in.
   * Without it the SDK behaves like a real client: sign in / sign up, then it carries its own tokens.
   */
  persona?: string;
  /** Extra options passed to the `QelosSDK` constructor (`appUrl` and `fetch` are managed here). */
  sdkOptions?: Record<string, unknown>;
}

export interface MockSdk {
  /** A real `QelosSDK` talking to the in-memory mock: no HTTP, no network. */
  sdk: QelosSDK;
  /** The mock engine behind it: `state`, `on()`, `handle()`, `fetch`. */
  mock: MockQelos;
  /** A second SDK on the same mock acting as another persona, e.g. `const admin = as('admin@example.com')`. */
  as(persona: string): QelosSDK;
  /** Drop all data and reseed from `seed` (call it in `beforeEach`). */
  reset(): void;
}

/**
 * Create an in-process Qelos mock and a real `QelosSDK` bound to it.
 *
 * ```ts
 * const { sdk, as } = createMockSdk({ seed: { personas: [{ email: 'a@x.com', password: 'p', roles: ['admin'] }] } });
 * const admin = as('a@x.com');
 * await admin.blueprints.entitiesOf('todos').create({ title: 'x' });
 * ```
 */
export function createMockSdk(options: CreateMockSdkOptions = {}): MockSdk {
  const { persona, sdkOptions, ...mockOptions } = options;
  const mock = createMockQelos({ logger: () => {}, ...mockOptions });
  const appUrl = mockOptions.tenant?.appUrl || APP_URL;

  const build = (asPersona?: string): QelosSDK =>
    new QelosSDKClass({
      ...sdkOptions,
      appUrl,
      fetch: mock.fetch,
      ...(asPersona ? { extraHeaders: async () => ({ [PERSONA_HEADER]: asPersona }) } : {}),
    });

  return {
    sdk: build(persona),
    mock,
    as: build,
    reset: () => {
      mock.state.reset();
    },
  };
}

export interface UseMockSdkHooks {
  /** The test framework's `beforeEach`. Defaults to the global one (Jest, Vitest with `globals: true`). */
  beforeEach?: (fn: () => void) => void;
}

/**
 * Create one mock SDK for a test file and reset it before every test.
 *
 * ```ts
 * import { beforeEach } from 'vitest';
 * const t = useMockSdk({ seed }, { beforeEach });
 * it('...', async () => { await t.as('admin@example.com').blueprints... });
 * ```
 */
export function useMockSdk(options: CreateMockSdkOptions = {}, hooks: UseMockSdkHooks = {}): MockSdk {
  const handle = createMockSdk(options);
  const hook = hooks.beforeEach ?? (globalThis as any).beforeEach;
  if (typeof hook !== 'function') {
    throw new Error('@qelos/testing: no global beforeEach found. Pass it: useMockSdk(options, { beforeEach })');
  }
  hook(() => handle.reset());
  return handle;
}
