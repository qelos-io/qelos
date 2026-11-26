import { getRequestHeader, proxyRequest, type H3Event } from 'h3';

/** Forward the current event to the Qelos API and answer with what it says. */
export function proxyToQelos(event: H3Event, target: string) {
  const originalHost = getRequestHeader(event, 'host');
  return proxyRequest(event, target, {
    fetch: globalThis.fetch,
    cookieDomainRewrite: { '*': originalHost ?? '' },
    // redirects (social login, ...) are for the browser: following them here would answer with another site's page
    fetchOptions: { redirect: 'manual' },
  });
}
