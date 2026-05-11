import {
  defineNuxtModule,
  addServerHandler,
  addImportsDir,
  createResolver,
  addTypeTemplate,
} from '@nuxt/kit';
import type { QelosNuxtRuntimeConfig } from './types';

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

export default defineNuxtModule<QelosNuxtModuleOptions>({
  meta: {
    name: '@qelos/integrator-nuxt',
    configKey: 'qelos',
    compatibility: {
      nuxt: '^3.0.0',
    },
  },
  defaults: {
    appUrl: '',
  },
  setup(options, nuxt) {
    if (!options.appUrl) {
      throw new Error('[@qelos/integrator-nuxt] `qelos.appUrl` must be set in nuxt.config');
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

export { createQelosMiddleware } from './middleware';
export { createRequestSdk } from './sdk-factory';
export { defineQelosEventHandler } from './event-handler';
export type {
  DefineQelosEventHandlerOptions,
  QelosEventContext,
  QelosEventHandler,
} from './event-handler';
export type {
  QelosNuxtRuntimeConfig,
  QelosRequestContext,
  QelosTokenPair,
} from './types';
