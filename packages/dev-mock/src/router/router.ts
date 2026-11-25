import type { MockState } from '../state/mock-state.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS' | '*';

export interface RouteContext {
  request: Request;
  url: URL;
  params: Record<string, string>;
  query: URLSearchParams;
  state: MockState;
  /** parse the JSON body (undefined when empty) */
  json<T = any>(): Promise<T | undefined>;
}

export type RouteResult = Response | unknown;
export type RouteHandler = (ctx: RouteContext) => RouteResult | Promise<RouteResult>;
export type RouteModule = (router: Router, state: MockState) => void;

interface Route {
  method: HttpMethod;
  segments: string[];
  wildcard: boolean;
  handler: RouteHandler;
}

export function jsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  const h = new Headers(headers);
  if (!h.has('content-type')) h.set('content-type', 'application/json');
  return new Response(JSON.stringify(body ?? null), { status, headers: h });
}

function split(path: string): string[] {
  return path.split('/').filter(Boolean);
}

/**
 * Small router: patterns support `:param` segments and a trailing `*` wildcard
 * (captured as params['*']). First registered matching route wins, except that
 * routes with an exact method beat `*` method routes.
 */
export class Router {
  private routes: Route[] = [];

  register(method: HttpMethod, pattern: string, handler: RouteHandler): this {
    const segments = split(pattern);
    const wildcard = segments[segments.length - 1] === '*';
    if (wildcard) segments.pop();
    this.routes.push({ method: method.toUpperCase() as HttpMethod, segments, wildcard, handler });
    return this;
  }

  use(module: RouteModule, state: MockState): this {
    module(this, state);
    return this;
  }

  match(method: string, pathname: string): { handler: RouteHandler; params: Record<string, string> } | null {
    const parts = split(pathname);
    const m = method.toUpperCase();
    let fallback: { handler: RouteHandler; params: Record<string, string> } | null = null;
    for (const route of this.routes) {
      if (route.method !== m && route.method !== '*') continue;
      const params = matchSegments(route, parts);
      if (!params) continue;
      if (route.method === m) return { handler: route.handler, params };
      fallback ??= { handler: route.handler, params };
    }
    return fallback;
  }

  async dispatch(ctx: Omit<RouteContext, 'params'>): Promise<Response | null> {
    const found = this.match(ctx.request.method, ctx.url.pathname);
    if (!found) return null;
    const result = await found.handler({ ...ctx, params: found.params });
    return result instanceof Response ? result : jsonResponse(result);
  }
}

function matchSegments(route: Route, parts: string[]): Record<string, string> | null {
  const { segments } = route;
  if (route.wildcard ? parts.length < segments.length : parts.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.startsWith(':')) {
      try {
        params[seg.slice(1)] = decodeURIComponent(parts[i]);
      } catch {
        return null;
      }
    } else if (seg !== parts[i]) return null;
  }
  if (route.wildcard) params['*'] = parts.slice(segments.length).join('/');
  return params;
}
