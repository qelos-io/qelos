import type { IUser } from '@qelos/sdk/dist/authentication';

export function buildMeUrl(base: string): string {
  return `${base.replace(/\/+$/, '')}/api/me`;
}

export interface FetchMeIdentityParams {
  base: string;
  cookie?: string;
  authorization?: string;
}

/**
 * Server-side `GET /api/me` against Qelos with inbound auth material forwarded.
 * Does not rewrite `Set-Cookie`; callers apply {@link rewriteSetCookieDomain}.
 */
export async function fetchMeIdentity(
  params: FetchMeIdentityParams,
): Promise<{ response: Response; user: IUser | null }> {
  const headers: Record<string, string> = {};
  if (params.cookie) headers.cookie = params.cookie;
  if (params.authorization) headers.authorization = params.authorization;

  let response: Response;
  try {
    response = await fetch(buildMeUrl(params.base), {
      method: 'GET',
      headers,
      redirect: 'manual',
    });
  } catch {
    return { response: new Response(null, { status: 502 }), user: null };
  }

  if (!response.ok) {
    return { response, user: null };
  }

  try {
    return { response, user: (await response.json()) as IUser };
  } catch {
    return { response, user: null };
  }
}
