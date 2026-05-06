import { defineNuxtModule, addServerHandler, createResolver, addTypeTemplate } from '@nuxt/kit';
import type { QelosNuxtRuntimeConfig } from './types';

export interface QelosNuxtModuleOptions extends QelosNuxtRuntimeConfig {
  /**
   * Disable registration of the default server middleware. Use this if you
   * want to call `createQelosMiddleware` yourself from your own server route.
   */
  disableMiddleware?: boolean;
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

    const { disableMiddleware, ...runtimeConfig } = options;

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
export type {
  QelosNuxtRuntimeConfig,
  QelosRequestContext,
  QelosTokenPair,
  ResolvedTokens,
  TokenRefreshContext,
  TokenRefreshHook,
} from './types';
