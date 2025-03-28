import { Router } from 'vue-router';
import { RouteLocationNormalizedLoaded } from 'vue-router';

// Extend the Vue types
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $router: Router;
    $route: RouteLocationNormalizedLoaded;
  }
}

// Add Vite environment variables type
declare interface ImportMeta {
  readonly env: Record<string, string>;
}

// Add window global properties
interface Window {
  SENTRY_DSN?: string;
  opera?: any;
}
