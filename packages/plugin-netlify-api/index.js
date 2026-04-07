const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_API_URL = 'http://159.203.152.168';

/** Must appear before any `/*` rule in publish/_redirects — Netlify evaluates that file before netlify.toml. */
const REDIRECTS_FILE_LINE =
  '/api/* /.netlify/functions/qelos-api-proxy 200!\n';

function resolveFunctionsDirectory(netlifyConfig) {
  const dir = netlifyConfig.functions?.directory ?? 'netlify/functions';
  return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
}

module.exports = {
  async onPreBuild({ netlifyConfig, inputs }) {
    const apiUrl =
      inputs.api_url ?? process.env.QELOS_API_IP ?? DEFAULT_API_URL;
    const bypassAdmin =
      inputs.bypass_admin === true || inputs.bypass_admin === 'true';

    // Ensure build.environment exists
    if (!netlifyConfig.build.environment) {
      netlifyConfig.build.environment = {};
    }
    netlifyConfig.build.environment.QELOS_API_IP = apiUrl;
    if (bypassAdmin) {
      netlifyConfig.build.environment.QELOS_BYPASS_ADMIN_HEADER = 'true';
    }

    if (!netlifyConfig.functions) {
      netlifyConfig.functions = { directory: 'netlify/functions' };
    }

    // Copy the proxy into the site's functions dir so Netlify bundles it like any
    // checked-in function (utils.functions.add from node_modules is unreliable for .ts).
    const destDir = resolveFunctionsDirectory(netlifyConfig);
    const destFile = path.join(destDir, 'qelos-api-proxy.ts');
    const srcFile = path.join(__dirname, 'functions', 'qelos-api-proxy.ts');
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(srcFile, destFile);

    // Add redirect: /api/* -> Netlify function (proxy)
    if (!netlifyConfig.redirects) {
      netlifyConfig.redirects = [];
    }
    netlifyConfig.redirects.push({
      from: '/api/*',
      to: '/.netlify/functions/qelos-api-proxy',
      status: 200,
      force: true,
    });
  },

  /**
   * Nuxt/static generators emit `dist/_redirects` with `/* → 404` first. Netlify runs
   * `_redirects` rules before `netlify.toml`, so that catch-all wins unless `/api/*` is
   * prepended here (after the framework build).
   */
  async onPostBuild({ constants }) {
    const publishDir = constants.PUBLISH_DIR;
    if (!publishDir) return;
    const redirectsPath = path.join(publishDir, '_redirects');
    let existing = '';
    try {
      existing = await fs.readFile(redirectsPath, 'utf8');
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    if (existing.includes('qelos-api-proxy')) return;
    await fs.writeFile(redirectsPath, REDIRECTS_FILE_LINE + existing, 'utf8');
  },
};
