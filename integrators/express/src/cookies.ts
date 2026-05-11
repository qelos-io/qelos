/**
 * Rewrite the `Domain=` attribute of a single `Set-Cookie` header value.
 *
 * - If the cookie contains a `Domain=<value>` attribute (case-insensitive), its
 *   value is replaced with `newDomain`, with any trailing `:port` suffix
 *   stripped first (cookie `Domain` attributes do not include a port).
 * - If `newDomain` is `undefined` (or empty), the entire `; Domain=<value>`
 *   segment is removed so the browser scopes the cookie to the current host.
 * - If no `Domain=` attribute is present, the input is returned unchanged.
 *
 * All other attributes, their casing/order and the original cookie name/value
 * bytes are preserved.
 */
export function rewriteSetCookieDomain(
  setCookie: string,
  newDomain: string | undefined,
): string {
  const domainSegment = /;\s*Domain\s*=\s*[^;]+/i;
  if (!domainSegment.test(setCookie)) return setCookie;

  const stripped = newDomain ? stripPort(newDomain) : '';
  if (!stripped) {
    return setCookie.replace(domainSegment, '');
  }
  return setCookie.replace(
    /(;\s*Domain\s*=\s*)[^;]+/i,
    `$1${stripped}`,
  );
}

/**
 * Apply {@link rewriteSetCookieDomain} to each entry of a `Set-Cookie` array
 * (e.g. the result of `Headers.getSetCookie()`).
 */
export function rewriteSetCookieDomains(
  values: string[],
  newDomain: string | undefined,
): string[] {
  return values.map((value) => rewriteSetCookieDomain(value, newDomain));
}

function stripPort(host: string): string {
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end === -1 ? host : host.slice(1, end);
  }
  const colon = host.indexOf(':');
  return colon === -1 ? host : host.slice(0, colon);
}
