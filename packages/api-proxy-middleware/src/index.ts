import fetch from 'node-fetch';
import { createProxyMiddleware as proxy } from 'http-proxy-middleware';
import { IApiProxyConfig, IServiceProxyConfig } from './types';
import { getApiProxyConfig } from './config';

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
    app.use(service.proxies, getProxy(getProxyTarget(service)));
  }

  const indexHtmlPromise = fetch(getProxyTarget(adminPanel) + '/index.html').then(res => res.text())

  const defaultApplicationHost = new URL(applicationUrl).host;
  const meUrl = getProxyTarget(authService) + '/api/me';
  const hostTenantUrl = getProxyTarget(contentService) + '/internal-api/host-tenant';
  const ssrScriptsUrl = getProxyTarget(contentService) + '/internal-api/configurations/ssr-scripts';

  function getTenantByHost(hostUrl: string) {
    return cacheManager.wrap(':' + hostUrl, () => {
      return fetch(hostTenantUrl + '?host=' + hostUrl)
        .then((res) => res.json())
        .then((data) => data.tenant);
    });
  }

  function getTenantSsrScripts(tenant: string) {
    return cacheManager.wrap('ssr-scripts:' + tenant, () => {
      return fetch(ssrScriptsUrl + '?tenant=' + tenant)
        .then((res) => res.json())
        .then((data) => data.metadata || {})
        .catch(() => ({}));
    });
  }

  app.use(async (req, res, next) => {
    const host = req.headers.host;
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
    next();
  });

  const allServicesPrefixesExceptAuth = [...contentService.proxies, ...assetsService.proxies, ...draftsService.proxies, ...pluginsService.proxies, ...noCodeService.proxies];

  app.use(
    [...authService.proxies, ...allServicesPrefixesExceptAuth],
    require('cors')((req, callback) => {
      // TODO: support subdomains of host
      const host = req.header.host || req.headers.host;
      if (!req.disableCors && req.header('Origin') === host) {
        callback(null, { credentials: true, origin: true });
      } else {
        callback(null, { credentials: false, origin: false });
      }
    })
  );

  app.use(allServicesPrefixesExceptAuth, (req, res, next) => {
    if (!(req.headers.authorization || (req.headers.cookie && req.headers.cookie.includes('token=')))) {
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
      },
    })
      .then((response) => {
        const setCookie = response.headers.raw()['set-cookie'];
        if (setCookie) {
          res.set('set-cookie', setCookie);
        }
        if (response.status === 200) {
          return response.text();
        }
      })
      .then((user = '') => {
        req.headers.user = user;

        next();
      })
      .catch(() => {
        next();
      });
  });

  useProxy(app, authService);
  useProxy(app, contentService);
  useProxy(app, draftsService);
  useProxy(app, assetsService);
  useProxy(app, noCodeService);
  useProxy(app, pluginsService);

  const ignoreExtensions = ['js', 'json', 'jpg', 'svg', 'png', 'ico', 'ts', 'vue', 'css', 'map', 'scss', 'json', 'mjs']

  app.use(async (req, res, next) => {
    const extension = req.path.split('.').pop();
    if (req.path.startsWith('/@') || req.path.startsWith('src') || ignoreExtensions.includes(extension)) {
      next()
      return;
    }

    const scripts = await getTenantSsrScripts(req.headers.tenant)
    const html = (await indexHtmlPromise)
      .replace('<!--HEAD-->', scripts?.head || STATIC_HEAD)
      .replace('<!--BODY-->', scripts?.body || '');

    res.set('content-type', 'text/html').send(html).end()
  })

  useProxy(app, adminPanel);
}
