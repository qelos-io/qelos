import { getRouter, populateUser } from '@qelos/api-kit';
import { getPluginProxy } from '../controllers/play-plugins';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { proxyApiPrefix } from '../../config';
import { IPlugin } from '../models/plugin';
import httpAgent from '../services/http-agent';
import * as http from 'node:http';
import { Request, Response } from 'express';
import { clearPluginAccessToken } from '../services/tokens-management';
import logger from '../services/logger';

declare module 'express' {
  interface Request {
    plugin: Pick<IPlugin, 'token' | 'proxyUrl'>;
    pluginUrl: string;
    apiPath: string;
    user?: any;
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
      res.status(401).json({ message: 'plugin not exist' });
      return;
    }

    req.plugin = plugin;
    req.apiPath = apiPath;
    req.pluginUrl = plugin.proxyUrl.startsWith('http') ? plugin.proxyUrl : `https://${plugin.proxyUrl}`;

    next();
  }

  router.use(proxyApiPrefix, populateUser, loadPluginRequest, createProxyMiddleware({
    changeOrigin: true,
    agent: httpAgent,
    pathRewrite(path, req) {
      return path.split(proxyApiPrefix + '/' + req.apiPath)[1];
    },
    router(req) {
      return req.pluginUrl;
    },
    onProxyReq(proxyReq, req: any) {
      proxyReq.removeHeader('cookie');
      proxyReq.setHeader('Authorization', 'Bearer ' + req.plugin.token);
      
      // Forward the user header if it exists (already decoded by populateUser middleware)
      if (req.user) {
        proxyReq.setHeader('user', JSON.stringify(req.user));
      }
    },
    onProxyRes(proxyRes: http.IncomingMessage, req: Request, res: Response) {
      if (proxyRes.headers['x-q-auth'] === 'unauthorized' || proxyRes.statusCode === 407) {
        clearPluginAccessToken(req.headers.tenant as string, req.apiPath).catch(logger.error);
      }
    }
  }))

  return router;
}
