import uniqid from 'uniqid';
import { IntegrationSourceKind } from '../models/integration-source';
import { getSecret, setSecret } from './secrets-service';

export async function getEncryptedSourceAuthentication(tenant: string, kind: IntegrationSourceKind, authId: string) {
  return (await getSecret(tenant, `integration-source-${kind}-${authId}`))?.value;
}

export async function storeEncryptedSourceAuthentication(tenant: string, kind: IntegrationSourceKind, authentication: any = {}, authId = uniqid()) {
  if (kind === 'qelos') {
    const { username, password } = authentication;
    await setSecret(tenant, `integration-source-${kind}-${authId}`, { username, password });
    return authId;
  }

  return;
}
