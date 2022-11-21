import {fetch as undiciFetch} from 'undici';
import QelosAdministratorSDK from '@qelos/sdk/dist/administrator';
import {FetchLike, QelosSDKOptions} from '@qelos/sdk/dist/types';
import config from './config';
import {StandardPayload} from './handlers';

let localSdk: QelosAdministratorSDK<{ tokenIdentifier: string }>;

async function authenticate() {
  try {
    await localSdk.authentication.oAuthSignin({email: config.greenpressUsername, password: config.greenpressPassword});
    console.log('authenticated successfully to ' + config.greenpressUrl)
  } catch (err) {
    console.log('could not authenticate to own greenpress app');
    process.exit(1);
  }
}

export function getSdkForUrl<T = any>(appUrl: string, refreshToken?: string, accessToken?: string): QelosAdministratorSDK {
  const options: QelosSDKOptions = {appUrl, fetch: globalThis.fetch || undiciFetch as any as FetchLike};
  if (refreshToken) {
    options.refreshToken = refreshToken;
  }
  if (accessToken) {
    options.accessToken = accessToken;
  }
  return new QelosAdministratorSDK<T>(options);
}

export function getSdk(): QelosAdministratorSDK {
  if (localSdk) {
    return localSdk;
  }
  localSdk = getSdkForUrl<{ tokenIdentifier: string }>(config.greenpressUrl);
  authenticate();
  return localSdk;
}

export async function getSdkForTenant(tenantPayload: StandardPayload): Promise<QelosAdministratorSDK | null> {
  try {
    const data = await getSdk().users.getEncryptedData(tenantPayload.sub);
    if (!data.appUrl) {
      return null;
    }
    const sdk = getSdkForUrl(data.appUrl, data.currentAuthPayload?.refreshToken, data.currentAuthPayload?.token);
    return sdk;
  } catch (e) {
    if (config.dev) {
      console.log(e);
    }
    return null;
  }
}
