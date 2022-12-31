import {FastifyInstance} from 'fastify';
import {ConfigOptions} from './config';
import {ManifestOptions} from './manifest';

export enum LifecycleEvent {
  beforeCreate,
  beforeMount,
  mounted,
  beforeConfigure,
  configured,
}


export interface BeforeCreatePayload {
  fastifyOptions: {logger: boolean, https: string | null} & any,
  config: ConfigOptions,
  manifest: ManifestOptions,
}

export interface BeforeMountPayload {
  app: FastifyInstance,
  fastifyOptions: {logger: boolean, https: string | null} & any,
  config: ConfigOptions,
  manifest: ManifestOptions,
}

export interface MountedPayload {
  app: FastifyInstance,
  config: ConfigOptions,
  manifest: ManifestOptions,
}

export interface BeforeConfigurePayload {
  config: ConfigOptions,
  manifest: ManifestOptions,
  manifestOptions: ManifestOptions,
  configOptions: ConfigOptions,
}

export interface ConfiguredPayload {
  config: ConfigOptions,
  manifest: ManifestOptions,
}


const callbacks = {
  [LifecycleEvent.beforeCreate]: new Set<((payload) => unknown)>(),
  [LifecycleEvent.beforeMount]: new Set<((payload) => unknown)>(),
  [LifecycleEvent.mounted]: new Set<((payload) => unknown)>(),
  [LifecycleEvent.beforeConfigure]: new Set<((payload) => unknown)>(),
  [LifecycleEvent.configured]: new Set<((payload) => unknown)>(),
};

export function on(eventName: LifecycleEvent.beforeCreate, callback: (payload: BeforeCreatePayload) => unknown): void;
export function on(eventName: LifecycleEvent.beforeConfigure, callback: (payload: BeforeConfigurePayload) => unknown): void;
export function on(eventName: LifecycleEvent.beforeMount, callback: (payload: BeforeMountPayload) => unknown): void;
export function on(eventName: LifecycleEvent.configured, callback: (payload: ConfiguredPayload) => unknown): void;
export function on(eventName: LifecycleEvent.mounted, callback: (payload: MountedPayload) => unknown): void;
export function on(eventName: LifecycleEvent, callback) {
  callbacks[eventName].add(callback);
}

export function trigger(eventName: LifecycleEvent.beforeCreate, payload: BeforeCreatePayload): void;
export function trigger(eventName: LifecycleEvent.beforeConfigure, payload: BeforeConfigurePayload): void;
export function trigger(eventName: LifecycleEvent.beforeMount, payload: BeforeMountPayload): void;
export function trigger(eventName: LifecycleEvent.configured, payload: ConfiguredPayload): void;
export function trigger(eventName: LifecycleEvent.mounted, payload: MountedPayload): void;
export function trigger(eventName: LifecycleEvent, payload) {
  callbacks[eventName]?.forEach(callback => {
    callback(payload)
  })
}