import type { Request, Response } from 'express';
import type QelosSDK from '@qelos/sdk';
import type { SocialAuthCallbackPayload } from '@qelos/sdk';
import { getSocialAuthSetCookieParts } from '@qelos/sdk';
import { rewriteSetCookieDomain } from './cookies';

/**
 * Runs {@link QelosSDK.authentication.socialCallback} for `requestUrl` and
 * forwards session `Set-Cookie` headers to the Express response, rewriting
 * the `Domain=` attribute of each cookie to the inbound request's host so
 * the upstream-issued cookies land as first-party on the integrator host.
 */
export async function completeSocialAuthCallback(
  sdk: QelosSDK,
  req: Pick<Request, 'url' | 'headers'>,
  res: Pick<Response, 'setHeader'>,
): Promise<SocialAuthCallbackPayload> {
  const result = await sdk.authentication.socialCallback(req.url);
  const parts = getSocialAuthSetCookieParts(result);
  if (parts.length) {
    const host = req.headers.host;
    const rewritten = parts.map((value) => rewriteSetCookieDomain(value, host));
    res.setHeader('Set-Cookie', rewritten.length === 1 ? rewritten[0]! : rewritten);
  }
  return result;
}

export {
  getSocialAuthSetCookieParts,
  parseSocialCallbackRefreshToken,
  type SocialAuthCallbackPayload,
  type SocialCallbackInput,
} from '@qelos/sdk';
