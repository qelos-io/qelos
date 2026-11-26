// This file is registered as a Nuxt server middleware by `module.ts`.
// It is bundled by Nitro, so `#imports` resolves at the consuming-app build
// time (not at this package's `tsc` build).
// @ts-ignore - resolved by Nitro
import { useRuntimeConfig } from '#imports';
import { createQelosMiddleware } from '../middleware.js';
import type { QelosNuxtRuntimeConfig } from '../types.js';

const runtimeConfig = useRuntimeConfig();
const config = (runtimeConfig.qelos || {}) as QelosNuxtRuntimeConfig;

export default createQelosMiddleware({ config });
