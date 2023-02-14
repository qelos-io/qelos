import {existsSync, readFileSync} from 'fs';
import {join} from 'path';
import fastify, {FastifyInstance} from 'fastify';
import {RouteHandlerMethod} from 'fastify/types/route';
import type {FastifyCookieOptions} from '@fastify/cookie'
import cookie from '@fastify/cookie'
import {manifest, ManifestOptions} from './manifest';
import config, {ConfigOptions, setConfig} from './config';
import {
  getCallbackRoute,
  getFrontendAuthorizationRoute,
  getFrontendUnAuthorizationRoute,
  getRefreshTokenRoute,
  getRegisterRoute,
  verifyAccessToken,
  verifyCookieToken
} from './authentication';
import handlers from './handlers';
import {endpoints, internalEndpoints} from './endpoints';
import {LifecycleEvent, trigger} from './lifecycle';

const hooks = new Set<{ subscribedEvent, path, handler }>();

let app: FastifyInstance;
let internalApp: FastifyInstance;

export async function start(options?: { manifest?: ManifestOptions, config?: ConfigOptions }) {
  configure(options?.manifest || {}, options?.config || {});

  const app = getApp();
  if (internalEndpoints.size) {
    createInternalApp();
  }
  try {
    console.log('start application for environment: ', config.dev ? 'development' : 'production');
    await app.listen({port: Number(config.port), host: config.host});

    if (internalApp) {
      console.log(`Internal Application listening on: ${config.internalHost}:${config.internalPort}`);
      await internalApp.listen({port: Number(config.internalPort), host: config.internalHost});
    }

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

export function configure(manifestOptions: ManifestOptions, appConfig: ConfigOptions) {
  trigger(LifecycleEvent.beforeConfigure, {manifest, config, manifestOptions, configOptions: appConfig});

  Object.assign(manifest, manifestOptions);
  setConfig(appConfig);

  if (config.dev && !manifest.appUrl) {
    manifest.appUrl = 'https://' + config.host + ':' + config.port;
  }
  manifest.proxyUrl = new URL(manifest.proxyPath, manifest.appUrl).href;

  trigger(LifecycleEvent.configured, {manifest, config})
}

export function getApp(): FastifyInstance {
  return app || createApp();
}

export function registerToHook(hook: { source?: string, kind?: string, eventName?: string, path?: string }, handler: RouteHandlerMethod) {
  hook.path = hook.path || btoa(JSON.stringify(hook));
  const subscribedEvent = {
    source: hook.source || '*',
    kind: hook.kind || '*',
    eventName: hook.eventName || '*',
  };
  hooks.add({
    subscribedEvent,
    path: hook.path,
    handler
  });
  manifest.subscribedEvents.push(subscribedEvent);
}

function createApp(): FastifyInstance {
  const fastifyOptions = {
    logger: !!config.dev,
    https: getHttps()
  };
  trigger(LifecycleEvent.beforeCreate, {fastifyOptions, config, manifest});
  app = fastify(fastifyOptions);
  trigger(LifecycleEvent.beforeMount, {app, fastifyOptions, config, manifest});

  app.addContentTypeParser('application/json', {parseAs: 'string'}, parseJsonRequest);

  app.route(getRefreshTokenRoute());
  app.route(getRegisterRoute());
  app.route(getCallbackRoute());
  playManifest();
  playHooks();
  playEndpoints();
  playFrontend();

  if (!(config.qelosUrl || handlers.refreshToken.length)) {
    throw new Error('you must provide either a refresh token handler or Qelos application credentials');
  }

  trigger(LifecycleEvent.mounted, {app, config, manifest})

  return app;
}

function createInternalApp() {
  const fastifyOptions = {
    logger: !!config.dev,
  };
  trigger(LifecycleEvent.beforeInternalAppCreate, {fastifyOptions})

  internalApp = fastify(fastifyOptions);
  internalApp.addContentTypeParser('application/json', {parseAs: 'string'}, parseJsonRequest);

  internalEndpoints.forEach((routeOptions) => {
    internalApp.route(routeOptions);
  });

  trigger(LifecycleEvent.internalAppMounted, {app: internalApp})

  return internalApp;
}

function playManifest() {
  getApp().route({
    method: 'GET',
    url: manifest.manifestUrl,
    handler({headers, body}, res) {
      setImmediate(() => handlers.manifest.forEach(cb => cb({headers, body})));
      res.header('Access-Control-Allow-Origin', '*');
      return manifest;
    }
  })
  console.log('manifest URL: ' + new URL(manifest.manifestUrl, manifest.appUrl).href)
}

function playHooks() {
  hooks.forEach(hook => {
    const routePath = join('/api/hooks', hook.path);
    hook.subscribedEvent.hookUrl = new URL(routePath, manifest.appUrl).href;
    getApp().route({
      method: 'POST',
      url: routePath,
      preHandler: verifyAccessToken,
      handler: hook.handler
    })
    console.log('subscribed event configured: ', routePath, hook.subscribedEvent);
  })
}

function playFrontend() {
  if (existsSync(config.staticFrontend.root)) {
    getApp().register(require('@fastify/static'), config.staticFrontend);
  }
}

function playEndpoints() {
  if (!endpoints.size) {
    return;
  }
  getApp().register(cookie, {
    parseOptions: {
      maxAge: 1000 * 60 * 30, // 30 MINUTES,
      secure: true,
      httpOnly: true,
      sameSite: config.dev ? 'none' : (process.env.SAME_SITE_COOKIES || true)
    }
  } as FastifyCookieOptions);
  getApp().route(getFrontendAuthorizationRoute());
  getApp().route(getFrontendUnAuthorizationRoute());
  endpoints.forEach((routeOptions, path) => {
    const route = {
      ...routeOptions,
    };
    if (routeOptions.verifyToken) {
      route.preHandler = path.startsWith(manifest.apiPath) ? verifyAccessToken : verifyCookieToken
    }
    getApp().route(route);
  })
}

function getHttps() {
  const certPath = join(process.cwd(), 'cert/cert.pem');
  if (existsSync(certPath)) {
    return {
      cert: readFileSync(join(process.cwd(), 'cert/cert.pem')).toString(),
      key: readFileSync(join(process.cwd(), 'cert/key.pem')).toString(),
    }
  }
  return null;
}

function parseJsonRequest(req, body, done) {
  try {
    const bodyStr = body.toString() as string;
    done(null, bodyStr ? JSON.parse(bodyStr) : {})
  } catch (err) {
    err.statusCode = 400
    done(err, undefined)
  }
}