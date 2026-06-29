export function createResMock() {
  let statusCode = 200;
  let redirectUrl: string | null = null;
  let jsonPayload: unknown = null;
  let ended = false;

  const res = {
    redirect(url: string) {
      redirectUrl = url;
      return res;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      jsonPayload = payload;
      return res;
    },
    end() {
      ended = true;
      return res;
    },
  };

  return {
    res,
    get statusCode() {
      return statusCode;
    },
    get redirectUrl() {
      return redirectUrl;
    },
    get jsonPayload() {
      return jsonPayload;
    },
    get ended() {
      return ended;
    },
  };
}

export function createSocialReq(overrides: Record<string, unknown> = {}) {
  const base = {
    headers: { tenant: 'tenant-1', tenanthost: 'app.example.com' },
    query: {},
    appConfig: {
      websiteUrls: ['app.example.com', 'localhost:3000'],
      name: 'App',
      logoUrl: '',
      description: '',
      keywords: '',
      slogan: '',
      language: 'en',
      direction: 'ltr',
      themeStylesUrl: '',
      scriptUrl: '',
      homeScreen: '/',
      colorsPalette: {},
      borderRadius: 0,
      baseFontSize: 16,
    },
    source: {
      metadata: { clientId: 'test-client', scope: 'email openid profile' },
      authentication: { clientSecret: 'test-secret' },
    },
    authConfig: {
      allowSocialAutoRegistration: true,
      socialLoginsSources: { google: 'src-1', github: 'src-1', facebook: 'src-1', linkedin: 'src-1' },
    },
  };
  return { ...base, ...overrides } as any;
}

export function getQueryParamFromRedirect(url: string, param: string): string | null {
  return new URL(url).searchParams.get(param);
}
