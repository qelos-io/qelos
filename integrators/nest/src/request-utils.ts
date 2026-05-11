import type { AnyRequest, AnyResponse, QelosNestConfig } from './types';

export function appendSetCookie(response: AnyResponse, value: string): void {
  const setHeader = response.setHeader || response.header;
  const getHeader = response.getHeader;
  const existing =
    typeof getHeader === 'function' ? getHeader.call(response, 'set-cookie') : undefined;
  let next: string[];
  if (Array.isArray(existing)) {
    next = [...existing, value];
  } else if (typeof existing === 'string') {
    next = [existing, value];
  } else {
    next = [value];
  }
  if (typeof setHeader === 'function') {
    setHeader.call(response, 'set-cookie', next);
  }
}

export function shouldSkip(
  request: AnyRequest,
  config: QelosNestConfig,
): boolean {
  if (!config.skipPaths?.length) return false;
  const url = request.path || request.url || '';
  const queryIdx = url.indexOf('?');
  const path = queryIdx >= 0 ? url.slice(0, queryIdx) : url;
  return config.skipPaths.some((prefix) => path.startsWith(prefix));
}
