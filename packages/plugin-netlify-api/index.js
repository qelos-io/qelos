const fs = require('node:fs/promises');
const path = require('node:path');

const { patchRedirects } = require('./scripts/patch-redirects.cjs');

const DEFAULT_API_URL = 'http://159.203.152.168';

function resolveFunctionsDirectory(netlifyConfig) {
  const dir = netlifyConfig.functions?.directory ?? 'netlify/functions';
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

function resolvePublishDir(constants, netlifyConfig) {
  if (constants?.PUBLISH_DIR) {
    return constants.PUBLISH_DIR;
  }
  const p = netlifyConfig?.build?.publish;
  if (!p) {
    return path.join(process.cwd(), 'dist');
  }
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

function upstreamOrigin(apiUrl) {
  const s = String(apiUrl ?? '').trim().replace(/\/$/, '');
  if (!s) {
    return new URL(DEFAULT_API_URL).origin;
  }
  if (/^https?:\/\//i.test(s)) {
    return new URL(s).origin;
  }
  return `http://${s}`;
}

function stripApiRedirects(redirects) {
  return (redirects || []).filter((r) => r && r.from !== '/api/*');
}

module.exports = {
  async onPreBuild({ netlifyConfig, inputs }) {
    const apiUrl =
      inputs.api_url ?? process.env.QELOS_API_IP ?? DEFAULT_API_URL;
    const bypassAdmin =
      inputs.bypass_admin === true || inputs.bypass_admin === 'true';
    const useFunctionProxy =
      inputs.use_function_proxy === true || inputs.use_function_proxy === 'true';

    if (!netlifyConfig.build.environment) {
      netlifyConfig.build.environment = {};
    }
    netlifyConfig.build.environment.QELOS_API_IP = apiUrl;
    netlifyConfig.build.environment.QELOS_NETLIFY_PROXY_MODE = useFunctionProxy
      ? 'function'
      : 'cdn';
    if (bypassAdmin) {
      netlifyConfig.build.environment.QELOS_BYPASS_ADMIN_HEADER = 'true';
    }

    if (!netlifyConfig.redirects) {
      netlifyConfig.redirects = [];
    }
    netlifyConfig.redirects = stripApiRedirects(netlifyConfig.redirects);

    if (useFunctionProxy) {
      if (!netlifyConfig.functions) {
        netlifyConfig.functions = { directory: 'netlify/functions' };
      }
      const destDir = resolveFunctionsDirectory(netlifyConfig);
      const destFile = path.join(destDir, 'qelos-api-proxy.ts');
      const srcFile = path.join(__dirname, 'functions', 'qelos-api-proxy.ts');
      await fs.mkdir(destDir, { recursive: true });
      await fs.copyFile(srcFile, destFile);

      netlifyConfig.redirects.unshift({
        from: '/api/*',
        to: '/.netlify/functions/qelos-api-proxy',
        status: 200,
        force: true,
      });
    } else {
      const origin = upstreamOrigin(apiUrl);
      const redirect = {
        from: '/api/*',
        to: `${origin}/api/:splat`,
        status: 200,
        force: true,
      };
      if (bypassAdmin) {
        redirect.headers = { 'X-Bypass-Admin': 'true' };
      }
      netlifyConfig.redirects.unshift(redirect);
    }
  },

  async onPostBuild({ constants, netlifyConfig, inputs }) {
    const publishDir = resolvePublishDir(constants, netlifyConfig);
    const apiUrl =
      inputs?.api_url ??
      netlifyConfig?.build?.environment?.QELOS_API_IP ??
      process.env.QELOS_API_IP ??
      DEFAULT_API_URL;
    const mode =
      netlifyConfig?.build?.environment?.QELOS_NETLIFY_PROXY_MODE === 'function'
        ? 'function'
        : 'cdn';
    const changed = patchRedirects(publishDir, apiUrl, mode);
    console.log(
      `[@qelos/plugin-netlify-api] onPostBuild: ${changed ? 'patched' : 'unchanged'} ${path.join(publishDir, '_redirects')} (${mode})`,
    );
  },
};
