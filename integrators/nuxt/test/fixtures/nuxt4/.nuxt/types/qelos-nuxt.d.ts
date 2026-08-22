
import type { QelosRequestContext } from '@qelos/integrator-nuxt/types';

declare module 'h3' {
  interface H3EventContext {
    qelos?: QelosRequestContext;
  }
}

export {};
