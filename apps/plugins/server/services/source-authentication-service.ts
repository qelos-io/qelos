import { IntegrationSourceKind } from '@qelos/global-types';
import uniqid from 'uniqid';
import { getSecret, setSecret } from './secrets-service';

export async function getEncryptedSourceAuthentication(tenant: string, kind: IntegrationSourceKind, authId: string) {
  return (await getSecret(tenant, `integration-source-${kind}-${authId}`))?.value;
}

export async function storeEncryptedSourceAuthentication(tenant: string, kind: IntegrationSourceKind, authentication: any = {}, authId = uniqid()) {
  if (kind === IntegrationSourceKind.Qelos) {
    const { username, password } = authentication;
    await setSecret(tenant, `integration-source-${kind}-${authId}`, { username, password });
    return authId;
  }

  return;
}
