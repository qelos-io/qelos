import { IntegrationSourceKind } from '../models/integration-source';
import { getSecret, setSecret } from './secrets-service';
import uniqid from 'uniqid';

export async function getEncryptedSourceAuthentication(tenant: string, kind: IntegrationSourceKind, authId: string) {
  return (await getSecret(tenant, `integration-source-${kind}-${authId}`))?.value;
}

export async function storeEncryptedSourceAuthentication(tenant: string, kind: IntegrationSourceKind, authentication: any = {}, authId = uniqid()) {
  if (kind === 'qelos') {
    const { external = false, url, username, password } = authentication;
    if (external && !(url && username && password)) {
      return;
    }
    await setSecret(tenant, `integration-source-${kind}-${authId}`, { external, url, username, password });
    return authId;
  }

  return;
}
