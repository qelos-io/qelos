import { createProxyMiddleware as proxy } from 'http-proxy-middleware';
import { IApiProxyConfig, IServiceProxyConfig } from './types';
import { getApiProxyConfig, internalServicesSecret } from './config';
import { setTimeout } from 'timers/promises';

const CSP = {
  default: `'self' 'unsafe-inline' 'unsafe-eval' https: https://*.clarity.ms https://*.qelos.io ${process.env.PRODUCTION ? '' : 'ws:'}`,
  img: `data: https: 'self'`,
  connect: `'self' https: ${process.env.PRODUCTION ? '' : 'http: ws:'}`,
  frame: `'self' 'unsafe-inline' 'unsafe-eval' https: ${process.env.PRODUCTION ? '' : 'http:'}`,
  style: `'self' 'unsafe-inline' https: ${process.env.PRODUCTION ? '' : 'http:'}`,
}

function getProxy(target: string) {
  return proxy({
    target,
    changeOrigin: true,
  });
}

function getProxyTarget(service: IServiceProxyConfig) {
  return `${service.protocol}://${service.url}:${service.port}`;
}

const STATIC_HEAD = '<link rel="icon" href="/favicon.ico" /><title>APP</title>'


export default function apiProxy(app: any, config: Partial<IApiProxyConfig>, cacheManager) {
  const {
    authService,
    contentService,
    adminPanel,
    assetsService,
    noCodeService,
    draftsService,
    pluginsService,
    aiService,
    tenant: defaultTenant,
    applicationUrl,
    internalUrl,
    excludedServices,
  } = { ...getApiProxyConfig(), ...config };

  function useProxy(app, service: IServiceProxyConfig) {
    if (excludedServices.includes(service.name)) {
      console.log('excluding proxy to ' + service.name);
      return;
    }
    console.log(`Proxy ${service.name} to: `, service.proxies);
    app.use(service.proxies, getProxy(getProxyTarget(service)));
  }

  function loadIndexHtml(retry = 0) {
    let url = getProxyTarget(adminPanel) + '/index.html';
    return fetch(url, {
      headers: {
        internal_secret: internalServicesSecret
      }
    })
      .then(res => {
        if (res.status === 200) {
          return res.text();
        }
        throw new Error('failed to load index.html');
      })
      .then(str => str.replace("NODE_ENV:'development'", `NODE_ENV:'${process.env.NODE_ENV || 'development'}'`))
      .catch(() => {
        if (retry > 5) {
          throw new Error('failed to load index.html');
        }
        console.log('failed to load index.html, retrying...');
        return setTimeout(1000).then(() => loadIndexHtml(retry + 1));
      })
  }

  let indexHtmlPromise = loadIndexHtml();

  setInterval(() => {
    indexHtmlPromise = loadIndexHtml();
  }, 1000 * 60 * 10); //every 10 minutes

  const defaultApplicationHost = new URL(applicationUrl).host;
  const meUrl = getProxyTarget(authService) + '/api/me';
  const hostTenantUrl = getProxyTarget(contentService) + '/internal-api/host-tenant';
  const ssrScriptsUrl = getProxyTarget(contentService) + '/internal-api/configurations/ssr-scripts';
  const appConfigUrl = getProxyTarget(contentService) + '/internal-api/configurations/app-configuration';

  function getTenantByHost(hostUrl: string) {
    return cacheManager.wrap(':' + hostUrl, () => {
      return fetch(hostTenantUrl + '?host=' + hostUrl, {
        headers: {
          internal_secret: internalServicesSecret
        }
      })
        .then((res) => res.json())
        .then((data) => data.tenant);
    });
  }

  function getTenantSsrScripts(tenant: string) {
    return cacheManager.wrap('ssr-scripts:' + tenant, () => {
      return fetch(ssrScriptsUrl, { headers: { internal_secret: internalServicesSecret, tenant } })
        .then((res) => res.json())
        .then((data) => data.metadata || {})
        .catch(() => ({}))
        .then(JSON.stringify)
    }).then(JSON.parse);
  }

  function getAppConfig(tenant: string) {
    return cacheManager.wrap('app-configuration:' + tenant, () => {
      return fetch(appConfigUrl, { headers: { internal_secret: internalServicesSecret, tenant } })
        .then((res) => res.json())
        .then((data) => data.metadata || {})
        .catch(() => ({}))
        .then(JSON.stringify)
    }).then(JSON.parse);
  }

  async function getTenantHTML(tenant: string) {
    return cacheManager.wrap('tenant-html:' + tenant, async () => {
      let html = await indexHtmlPromise;

      try {
        const [scripts, config] = await Promise.all([
          getTenantSsrScripts(tenant),
          getAppConfig(tenant)
        ])
        html = html
          .replace('<!--HEAD-->', scripts?.head || STATIC_HEAD)
          .replace('<!--BODY-->', scripts?.body || '')

        // replace {{propName}} with config[propName]
        html = html.replace(/{{(.*?)}}/g, (_, propName) => {
          if (propName.includes('.')) {
            const [key, value] = propName.split('.');
            return config[key]?.[value] || '';
          }
          return config[propName] || '';
        });
      } catch {
        // error in parse ssr-scripts
      }
      return html;
    }, { ttl: 60 }).catch(() => indexHtmlPromise)
  }

  app.use(async (req, res, next) => {
    // Get hostname from request URL or fallback to host header
    const originalHost = req.headers.host;
    const host = req.hostname || originalHost;
    // disable cors when tenant defined from request headers:
    if (req.headers.tenant) {
      req.disableCors = true;
    }

    if (host === defaultApplicationHost || host === internalUrl) {
      req.headers.tenant = req.headers.tenant || defaultTenant;
    } else {
      try {
        req.headers.tenant = (await getTenantByHost(host)) || '';
      } catch {
        //
      }
    }

    if (!req.headers.tenant) {
      res
        .status(400)
        .json({ message: 'no website for host: ' + host })
        .end();
      return;
    }
    req.headers.tenanthost = req.headers.host;
    req.headers.user = '';
    next();
  });

  const allServicesPrefixesExceptAuth = [...contentService.proxies, ...assetsService.proxies, ...draftsService.proxies, ...pluginsService.proxies, ...noCodeService.proxies, ...aiService.proxies];

  app.use(
    [...authService.proxies, ...allServicesPrefixesExceptAuth],
    require('cors')((req, callback) => {
      // TODO: support subdomains of host
      const host = req.header.host || req.headers.host
      if (!req.disableCors && req.header('Origin') === host) {
        callback(null, { credentials: true, origin: true });
      } else {
        callback(null, { credentials: false, origin: false });
      }
    })
  );

  app.use(allServicesPrefixesExceptAuth, (req, res, next) => {
    if (!(req.headers.authorization || (req.headers.cookie && req.headers.cookie.includes('qlt_')))) {
      next();
      return;
    }
    fetch(meUrl, {
      headers: {
        'Content-Type': 'application/json',
        tenant: req.headers.tenant,
        cookie: req.headers.cookie,
        tenanthost: req.headers.host,
        authorization: req.headers.authorization,
        'x-impersonate-tenant': req.get('x-impersonate-tenant') || req.query.impersonateTenant?.toString() || '',
        'x-impersonate-user': req.get('x-impersonate-user') || req.query.impersonateUser?.toString() || '',
        'x-impersonate-workspace': req.get('x-impersonate-workspace') || req.query.impersonateWorkspace?.toString() || '',
      },
    })
      .then((response) => {
        const setCookie = response.headers.get('set-cookie');
        const setTenant = req.headers.tenant === defaultTenant && response.headers.get('x-qelos-tenant');
        if (setCookie) {
          res.set('set-cookie', setCookie);
        }
        if (setTenant) {
          req.headers.tenant = setTenant;
        }

        if (response.status === 200) {
          return response.text();
        }
      })
      .then((user = '') => {
        req.headers.user = user;
        next();
      })
      .catch((err) => {
        next();
      });
  });

  useProxy(app, authService);
  useProxy(app, contentService);
  useProxy(app, draftsService);
  useProxy(app, assetsService);
  useProxy(app, noCodeService);
  useProxy(app, pluginsService);
  useProxy(app, aiService);

  const ignoreExtensions = ['js', 'json', 'jpg', 'svg', 'png', 'ico', 'ts', 'vue', 'css', 'map', 'scss', 'json', 'mjs']

  app.use(async (req, res, next) => {
    const extension = req.path.split('.').pop();
    if (req.path.startsWith('/@') || req.path.startsWith('src') || ignoreExtensions.includes(extension)) {
      next()
      return;
    }

    const html = await getTenantHTML(req.headers.tenant);

    res.set('Content-Security-Policy', `default-src ${CSP.default}; img-src ${CSP.img}; connect-src ${CSP.connect}; frame-src ${CSP.frame}; style-src-elem ${CSP.style};`);
    res.set('content-type', 'text/html').send(html).end()
  })

  useProxy(app, adminPanel);
}
