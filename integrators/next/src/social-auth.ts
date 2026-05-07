import type QelosSDK from '@qelos/sdk';
import type { SocialAuthCallbackPayload } from '@qelos/sdk';
import { applySocialAuthCookiesToServerResponse } from '@qelos/sdk';

/**
 * Runs {@link QelosSDK.authentication.socialCallback} for `requestUrl` and
 * forwards session `Set-Cookie` headers to `res` (Next.js Pages `NextApiResponse`,
 * App Route handlers using `NextResponse` should set cookies via the Response API
 * instead — use the SDK helpers from `@qelos/sdk` directly there).
 */
export async function completeSocialAuthCallback(
  sdk: QelosSDK,
  requestUrl: string,
  res: { setHeader(name: string, value: string | string[]): void },
): Promise<SocialAuthCallbackPayload> {
  const result = await sdk.authentication.socialCallback(requestUrl);
  applySocialAuthCookiesToServerResponse(res, result);
  return result;
}

export {
  applySocialAuthCookiesToServerResponse,
  getSocialAuthSetCookieParts,
  parseSocialCallbackRefreshToken,
  type SocialAuthCallbackPayload,
  type SocialCallbackInput,
} from '@qelos/sdk';
