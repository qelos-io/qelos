import jwt from 'jsonwebtoken';
import {RouteOptions} from 'fastify/types/route';
import {FastifyRequest} from 'fastify/types/request';
import manifest from './manifest';
import handlers, {onCallback, onFrontendAuthorization, onNewTenant, onRefreshToken, StandardPayload} from './handlers';
import config from './config';
import {getSdk, getSdkForUrl} from './sdk';
import {ResponseError} from './response-error';
import logger from './logger';
import {atob} from 'buffer';

const notAuthorized = {message: 'you are not authorized'};

function getHostname(fullUrl: string) {
  if (!fullUrl.startsWith('http')) {
    fullUrl = 'https://' + fullUrl;
  }
  const url = new URL(fullUrl);
  return url.hostname;
}

export async function verifyAccessToken(req: FastifyRequest): Promise<void> {
  const {authorization} = req.headers;

  const token = authorization?.split(' ')[1];

  if (!token) {
    throw new Error('authorization token was not provided');
  }

  try {
    req.tenantPayload = jwt.verify(token, config.accessTokenSecret);
  } catch (err) {
    logger.log('error in callback', err);
    throw new Error('authorization token was not valid');
  }
}

export async function verifyCookieToken(req: FastifyRequest): Promise<void> {
  const {code} = req.headers;
  if (!code) {
    throw new Error('authorization code was not provided');
  }
  const token = req.cookies?.['token_' + code];

  if (!token) {
    throw new Error('user is not authorized');
  }

  try {
    const data = jwt.verify(token, config.accessTokenSecret);
    req.tenantPayload = data.tenant;
    req.user = data.user;
  } catch {
    throw new Error('authorization token was not valid');
  }
}

export function getRefreshTokenRoute(): RouteOptions {

  const usersSdk = getSdk().users;

  if (config.qelosUrl) {
    onRefreshToken(async ({sub, identifier = ''}) => {
      const user = await usersSdk.getUser(sub);
      if (identifier.toString() !== user.internalMetadata?.tokenIdentifier) {
        throw new Error('user is not verified on Qelos BaaS')
      }
      const newPayload: StandardPayload = {
        sub,
        identifier: (Date.now() + Math.random()).toString().substring(0, 10)
      }
      await usersSdk.update(sub, {internalMetadata: {tokenIdentifier: newPayload.identifier}})
      return {payload: newPayload};
    })
  }

  return {
    method: 'POST',
    url: manifest.authAcquire.refreshTokenUrl,
    handler: async (request, reply) => {
      const expectedRefreshToken = request.headers['authorization']?.split(' ')[1];
      if (!expectedRefreshToken) {
        reply.statusCode = 401;
        return notAuthorized;
      }
      let payload: StandardPayload;
      try {
        if (!expectedRefreshToken || expectedRefreshToken === 'undefined') {
          throw new Error('expected refresh token is empty');
        }
        payload = jwt.verify(expectedRefreshToken, config.refreshTokenSecret);
        if (handlers.refreshToken.length) {
          for (let handler of handlers.refreshToken) {
            const result = await handler(payload, request);
            if (result?.payload as StandardPayload) {
              return {
                [manifest.authAcquire.refreshTokenKey]: jwt.sign(result.payload, config.refreshTokenSecret, {expiresIn: '90d'}),
                [manifest.authAcquire.accessTokenKey]: jwt.sign(result.payload, config.accessTokenSecret, {expiresIn: '1h'}),
              }
            }
          }
        }
      } catch (err) {
        logger.log('error in callback', err);
      }
      reply.statusCode = 401;
      return notAuthorized;
    }
  };
}

export function getRegisterRoute(): RouteOptions {

  const usersSdk = getSdk().users;

  if (config.qelosUrl) {
    onNewTenant(async ({email, password, appUrl}) => {
      const tenantSdk = getSdkForUrl(appUrl)
      const emailSplit = email.split('@');
      if (emailSplit.length === 2 && getHostname(appUrl) !== emailSplit[1].split(':')[0]) {
        throw new ResponseError('email must be provided from the same app url: ' + appUrl);
      }
      let currentAuthPayload;
      try {
        // email will be: {pluginId}.{tenantId}@${tenantHostname}
        const {payload} = await tenantSdk.authentication.oAuthSignin({email, password});
        if (!payload.user?.roles?.includes('plugin')) {
          throw new ResponseError('should retrieve a plugin user to app: ' + appUrl);
        }
        currentAuthPayload = payload;
      } catch (err) {
        logger.error('failure during login to qelos app', {email, appUrl, err})
        if (err instanceof ResponseError) {
          throw err;
        }
        throw new ResponseError('failed to login to qelos tenant: ' + appUrl);
      }
      const newPayload: StandardPayload = {
        sub: '',
        identifier: (Date.now() + Math.random()).toString().substring(0, 10)
      }
      const [existingUser] = await usersSdk.getList({email, exact: true});
      let user;
      if (existingUser) {
        user = existingUser;
        await usersSdk.update(user._id, {
          firstName: appUrl,
          lastName: 'qelos-player-app',
          email,
          password,
          internalMetadata: {tokenIdentifier: newPayload.identifier}
        });
      } else {
        user = await usersSdk.create({
          firstName: appUrl,
          lastName: 'qelos-player-app',
          email,
          password,
          roles: ['user'],
          internalMetadata: {tokenIdentifier: newPayload.identifier}
        });
      }

      await usersSdk.setEncryptedData(user._id, config.userPayloadSecret, {
        appUrl,
        email,
        password,
        currentAuthPayload
      })
      newPayload.sub = user._id;
      return {payload: newPayload};
    })
  }

  function getMissingCredentialsError({email, password, appUrl}: any) {
    if (email && password && appUrl) {
      return null;
    }
    const missing = [];
    if (email) {
      missing.push('email');
    }
    if (password) {
      missing.push('password');
    }
    if (appUrl) {
      missing.push('appUrl');
    }
    return {message: 'missing credentials: ' + missing.join(', ')}
  }

  return {
    method: 'POST',
    url: manifest.registerUrl,
    handler: async (request, reply) => {
      const missingErr = getMissingCredentialsError(request.body || {});
      if (missingErr) {
        reply.statusCode = 401;
        return missingErr;
      }
      try {
        if (handlers.newTenant.length) {
          for (let handler of handlers.newTenant) {
            const result = await handler(request.body, request);
            if (result?.payload as StandardPayload) {
              return {
                [manifest.authAcquire.refreshTokenKey]: jwt.sign(result.payload, config.refreshTokenSecret, {expiresIn: '90d'}),
                [manifest.authAcquire.accessTokenKey]: jwt.sign(result.payload, config.accessTokenSecret, {expiresIn: '1h'}),
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof ResponseError) {
          reply.statusCode = err.status;
          return {message: err.responseMessage};
        } else {
          logger.error('internal register error', err);
        }
      }
      reply.statusCode = 401;
      return notAuthorized;
    }
  };
}

export function getCallbackRoute(): RouteOptions {
  if (config.qelosUrl) {
    onCallback(async ({user, returnUrl}, request) => {
      const code = Math.floor(Math.random() * 1000).toString();
      // set the code on gp db
      // temporary set the data as drafts
      // TODO: add callback code-based endpoint in auth service
      await getSdk().drafts.setDraft({
        contextType: returnUrl,
        contextId: `${request.tenantPayload.sub}.${user.email}`,
        contextData: {
          code,
          user,
          created: Date.now(),
          tenant: request.tenantPayload
        }
      })
      return code;
    });
  }

  return {
    method: 'GET',
    url: manifest.callbackUrl,
    preHandler: verifyAccessToken,
    handler: async (request, reply) => {
      const queryParams: any = request.query || {};

      try {
        const returnUrl = new URL(atob(queryParams.returnUrl));
        const user = request.headers.user ? JSON.parse(request.headers.user as string) : undefined;
        request.user = user;

        for (let handler of handlers.callback) {
          const code = await handler({user, returnUrl: returnUrl.href}, request)

          if (code && typeof code === 'string') {
            returnUrl.searchParams.append('code', code);
            returnUrl.searchParams.append('token', jwt.sign({
              user,
              tenant: request.tenantPayload
            }, config.accessTokenSecret, {expiresIn: '10min'}));

            return {
              returnUrl: returnUrl.href
            }
          }
        }
      } catch (err) {
        logger.log('error in callback', err);
      }
      reply.statusCode = 401;
      return notAuthorized;
    }
  }
}

export function getFrontendAuthorizationRoute(): RouteOptions {
  let standaloneAuthorize: (reply) => Promise<any> = async () => {
    return;
  }
  if (config.qelosUrl) {
    onFrontendAuthorization(async ({returnUrl, user, tenant}) => {
      try {
        const draft = await getSdk().drafts.getDraft(returnUrl, `${tenant.sub}.${user.email}`);
        if (draft && draft.contextData) {
          return {
            code: draft.contextData.code,
            token: jwt.sign({code: draft.contextData, user, tenant}, config.accessTokenSecret, {expiresIn: '30min'}),
          }
        }
      } catch {
        //
      }
      return;
    });

    if (config.dev) {
      standaloneAuthorize = async (reply) => {
        const [fullUser] = await getSdk().users.getList({exact: true, email: config.qelosUsername});
        const user = {
          _id: fullUser._id,
          email: fullUser.email,
          firstName: fullUser.firstName,
          lastName: fullUser.lastName,
          roles: fullUser.roles
        }
        const tenant = {
          sub: user._id,
          identifier: user.email
        };
        reply.setCookie('token_default', jwt.sign({
          code: 'default',
          user,
          tenant
        }, config.accessTokenSecret, {expiresIn: '30min'}));
        return {
          user,
          tenant
        };
      }
    }
  }


  return {
    method: 'POST',
    url: manifest.authorizeUrl,
    handler: async (request, reply) => {
      const {returnUrl, token}: any = request.body || {};
      if (returnUrl && token) {
        try {
          const {user, tenant} = jwt.verify(token, config.accessTokenSecret);
          for (let handler of handlers.frontendAuth) {
            const cookieData = await handler({returnUrl, user, tenant}, request);

            if (cookieData && cookieData.code && cookieData.token) {
              reply.setCookie('token_' + cookieData.code, cookieData.token);
              return {
                user,
                tenant
              }
            }
          }
        } catch (err) {
          logger.log('error in callback', err);
        }
      }
      const response = await standaloneAuthorize(reply);
      if (!response) {
        reply.statusCode = 401;
        return notAuthorized;
      }
      return response;
    }
  }
}

export function getFrontendUnAuthorizationRoute(): RouteOptions {
  return {
    method: 'POST',
    url: manifest.unAuthorizeUrl,
    preHandler: verifyCookieToken,
    handler: async (request, reply) => {
      const code = request.headers.code;
      const user = request.user;
      const tenant = request.tenantPayload;
      reply.setCookie('token_' + code, '', {maxAge: 1});
      handlers.frontendUnAuth.forEach((handler) => handler({user, tenant}));
      return 'OK';
    }
  }
}
