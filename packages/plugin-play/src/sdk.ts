import { fetch as undiciFetch } from 'undici';
import QelosAdministratorSDK from '@qelos/sdk/dist/administrator';
import { FetchLike, QelosSDKOptions } from '@qelos/sdk/dist/types';
import config from './config';
import { StandardPayload } from './handlers';
import logger from './logger';

let localSdk: QelosAdministratorSDK<{ tokenIdentifier: string }>;

export function authenticate() {
  return localSdk.authentication.oAuthSignin({ username: config.qelosUsername, password: config.qelosPassword });
}

async function bootstrapAuthenticate() {
  try {
    await localSdk.authentication.oAuthSignin({ username: config.qelosUsername, password: config.qelosPassword });
    console.log('authenticated successfully to ' + config.qelosUrl)
  } catch (err) {
    console.log('could not authenticate to own qelos app');
    logger.error('connect to qelos error: ', err);
    process.exit(1);
  }
}

export function getSdkForUrl<T = any>(appUrl: string, refreshToken?: string, accessToken?: string, username?: string, password?: string): QelosAdministratorSDK {
  let sdk: QelosAdministratorSDK;
  const options: QelosSDKOptions = {
    appUrl,
    forceRefresh: true,
    fetch: globalThis.fetch || undiciFetch as any as FetchLike,
    ...(config.sdkOptions || {}),
    onFailedRefreshToken: async () => {
      await sdk.authentication.oAuthSignin({ username, password });
      // throw new Error('could not able to refresh token');
    }
  };
  if (refreshToken) {
    options.refreshToken = refreshToken;
  }
  if (accessToken) {
    options.accessToken = accessToken;
  }
  sdk = new QelosAdministratorSDK<T>(options);
  return sdk;
}

export function getSdk(): QelosAdministratorSDK {
  if (localSdk) {
    return localSdk;
  }
  localSdk = getSdkForUrl<{ tokenIdentifier: string }>(config.qelosUrl, null, null, config.qelosUsername, config.qelosPassword);
  bootstrapAuthenticate().catch();
  return localSdk;
}

export async function getSdkForTenant(tenantPayload: StandardPayload): Promise<QelosAdministratorSDK | null> {
  try {
    const data = await getEncryptedDataForTenant(tenantPayload, config.userPayloadSecret);
    if (!data.appUrl) {
      return null;
    }
    const sdk = getSdkForUrl(data.appUrl, data.currentAuthPayload?.refreshToken, data.currentAuthPayload?.token, data.username, data.password);
    return sdk;
  } catch (e) {
    logger.log(e)
    return null;
  }
}

export function getEncryptedDataForTenant(tenantPayload: StandardPayload, encryptedId: string = '') {
  return getSdk().users.getEncryptedData(tenantPayload.sub, encryptedId);
}

export function setEncryptedDataForTenant(tenantPayload: StandardPayload, encryptedId: string = '', data: any) {
  return getSdk().users.setEncryptedData(tenantPayload.sub, encryptedId, data);
}
