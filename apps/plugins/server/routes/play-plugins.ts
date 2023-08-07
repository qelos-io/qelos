import {getRouter} from '@qelos/api-kit';
import {getPluginProxy} from '../controllers/play-plugins';
import {createProxyMiddleware} from 'http-proxy-middleware';
import {proxyApiPrefix} from '../../config';
import {IPlugin} from '../models/plugin';
import httpAgent from '../services/http-agent';

declare module 'express' {
  interface Request {
    plugin: Pick<IPlugin, 'token' | 'proxyUrl'>;
    pluginUrl: string;
    apiPath: string;
  }
}

export function playPlugins() {
  const router = getRouter();

  async function loadPluginRequest(req, res, next) {
    const [_, apiPath] = req.originalUrl.slice(req.originalUrl.indexOf(proxyApiPrefix) + proxyApiPrefix.length).split('/');
    const plugin = await getPluginProxy({
      tenant: req.headers.tenant,
      apiPath,
      host: req.headers.tenanthost,
      appUrl: req.headers.origin
    });

    if (!plugin) {
      res.status(401).json({message: 'plugin not exist'});
      return;
    }

    req.plugin = plugin;
    req.apiPath = apiPath;
    req.pluginUrl = plugin.proxyUrl;
    next();
  }

  router.use(proxyApiPrefix, loadPluginRequest, createProxyMiddleware({
    changeOrigin: true,
    agent: httpAgent,
    pathRewrite(path, req) {
      return path.split(proxyApiPrefix + '/' + req.apiPath)[1];
    },
    router(req) {
      return req.pluginUrl;
    },
    onProxyReq(proxyReq, req) {
      proxyReq.removeHeader('cookie');
      proxyReq.setHeader('Authorization', 'Bearer ' + req.plugin.token);
    }
  }))

  return router;
}
