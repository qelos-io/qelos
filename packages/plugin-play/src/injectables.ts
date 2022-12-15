import manifest from './manifest';

export interface Injectable {
  name?: string;
  description?: string;
  html: string;
}

export function addInjectable(injectable: Injectable) {
  manifest.injectables.push(injectable);
}