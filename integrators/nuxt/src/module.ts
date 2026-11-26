import {
  defineNuxtModule,
  addServerHandler,
  addImportsDir,
  createResolver,
  addTypeTemplate,
} from '@nuxt/kit';
import type { QelosNuxtRuntimeConfig } from './types.js';

export interface QelosNuxtModuleOptions extends QelosNuxtRuntimeConfig {
  /**
   * Disable registration of the default server middleware. Use this if you
   * want to call `createQelosMiddleware` yourself from your own server route.
   */
  disableMiddleware?: boolean;
  /**
   * Disable registration of the catch-all `/api/**` proxy server handler.
   * Defaults to `false`.
   */
  disableProxy?: boolean;
}

// The workspace resolves two @nuxt/schema copies (3.21.4 and 4.5.2 - this package
// supports both Nuxt versions, and other workspace packages pin different ones), which
// makes tsc's declaration-portability check for the exported module non-deterministic
// across runs. `any` sidesteps needing to name a cross-package type for the export;
// runtime behavior is unaffected and is verified against real Nuxt 3 and 4 projects by
// e2e/packaging/next-nuxt.e2e.test.ts (at the repository root).
const qelosNuxtModule: any = defineNuxtModule<QelosNuxtModuleOptions>({
  meta: {
    name: '@qelos/integrator-nuxt',
    configKey: 'qelos',
    compatibility: {
      nuxt: '^3.0.0 || ^4.0.0',
    },
  },
  defaults: {
    appUrl: '',
  },
  setup(options, nuxt) {
    const mockEnv = process.env.QELOS_MOCK?.trim().toLowerCase();
    const mockOpt = options.mock;
    const mockWanted =
      mockOpt === undefined
        ? !!mockEnv && !['0', 'false', 'no', 'off'].includes(mockEnv)
        : mockOpt !== false && !(typeof mockOpt === 'object' && mockOpt.enabled === false);
    const allowInProduction =
      typeof mockOpt === 'object' && mockOpt !== null && mockOpt.allowInProduction === true;
    // Mirror the runtime production guard so a misconfigured deploy fails at build time.
    const mockRequested = mockWanted && (process.env.NODE_ENV !== 'production' || allowInProduction);
    if (!options.appUrl && !mockRequested) {
      throw new Error('[@qelos/integrator-nuxt] `qelos.appUrl` must be set in nuxt.config (or enable `qelos.mock` / QELOS_MOCK)');
    }

    const { resolve } = createResolver(import.meta.url);

    const { disableMiddleware, disableProxy, ...runtimeConfig } = options;

    if (!disableProxy) {
      // When the catch-all `/api/**` proxy is enabled, the user-resolution
      // middleware MUST skip `/api/` requests. The middleware itself calls
      // `${appUrl}/api/me` to identify the user, so without this skip
      // every inbound `/api/me` would be both proxied AND used as the
      // identification probe — a duplicate upstream hit and a potential
      // cookie-rewrite loop. Users can extend `skipPaths` further but
      // `/api/` must remain covered whenever `disableProxy` is false.
      const existingSkipPaths = runtimeConfig.skipPaths ?? [];
      const alreadyCovered = existingSkipPaths.some((prefix) => '/api/'.startsWith(prefix));
      if (!alreadyCovered) {
        runtimeConfig.skipPaths = ['/api/', ...existingSkipPaths];
      }
    }

    nuxt.options.runtimeConfig.qelos = {
      ...(nuxt.options.runtimeConfig.qelos as Record<string, unknown> | undefined),
      ...runtimeConfig,
    };

    if (!disableMiddleware) {
      addServerHandler({
        handler: resolve('./runtime/server-handler'),
        middleware: true,
      });
    }

    if (!disableProxy) {
      addServerHandler({
        route: '/api/**',
        handler: resolve('./runtime/api-proxy'),
      });
    }

    addImportsDir(resolve('./runtime/composables'));

    addTypeTemplate({
      filename: 'types/qelos-nuxt.d.ts',
      getContents: () => `
import type { QelosRequestContext } from '@qelos/integrator-nuxt/types';

declare module 'h3' {
  interface H3EventContext {
    qelos?: QelosRequestContext;
  }
}

export {};
`,
    });
  },
});

export default qelosNuxtModule;

export { createQelosMiddleware } from './middleware.js';
export { createRequestSdk } from './sdk-factory.js';
export { getQelosMock, MOCK_APP_URL } from './mock.js';
export type { QelosMockController, MockQelos } from './mock.js';
export { defineQelosEventHandler } from './event-handler.js';
export type {
  DefineQelosEventHandlerOptions,
  QelosEventContext,
  QelosEventHandler,
} from './event-handler.js';
export type {
  QelosNuxtRuntimeConfig,
  QelosRequestContext,
} from './types.js';
