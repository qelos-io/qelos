import {RouteOptions} from 'fastify/types/route';
import {join} from 'path';
import manifest from './manifest';

export interface QelosRouteParams extends RouteOptions {
  verifyToken: boolean;
}

export const endpoints = new Map<string, QelosRouteParams>()
export const internalEndpoints = new Map<string, RouteOptions>()

export function addProxyEndpoint(path: string, options: Partial<QelosRouteParams>) {
  endpoints.set(join(manifest.apiPath, path), {
    ...options,
    url: path,
    method: options.method || 'GET',
    handler: options.handler,
    verifyToken: true,
  })
}

export function addEndpoint(path: string, options: Partial<QelosRouteParams>) {
  const method = options.method || 'GET';
  endpoints.set(method + '::' + path, {
    ...options,
    url: path,
    method,
    handler: options.handler,
    verifyToken: 'verifyToken' in options ? options.verifyToken : true,
  })
}

export function addInternalEndpoint(path: string, options: Partial<RouteOptions>) {
  const method = options.method || 'GET';
  internalEndpoints.set(method + '::' + path, {
    ...options,
    url: path,
    method,
    handler: options.handler,
  })
}
