const path = require('node:path');

const DEFAULT_API_URL = 'http://159.203.152.168';

module.exports = {
  async onPreBuild({ netlifyConfig, utils, inputs }) {
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
      // [functions]
      //  directory = "netlify/functions"
      netlifyConfig.functions = { directory: 'netlify/functions' };
    } else {
      // should use this dir as path of the stored function
    }

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

    // Inject the proxy function (must run in onPreBuild so it's bundled)
    const pluginRoot = __dirname;
    const functionPath = path.join(
      pluginRoot,
      'functions',
      'qelos-api-proxy.ts',
    );
    await utils.functions.add(functionPath);
  },
};
