import { IntegrationSourceKind } from '@qelos/global-types';
import uniqid from 'uniqid';
import { getSecret, setSecret } from './secrets-service';

export async function getEncryptedSourceAuthentication(tenant: string, kind: IntegrationSourceKind, authId: string) {
  return (await getSecret(tenant, `integration-source-${kind}-${authId}`))?.value;
}

export async function storeEncryptedSourceAuthentication(tenant: string, kind: IntegrationSourceKind, authentication: any = {}, authId = uniqid()) {
  if (kind === IntegrationSourceKind.Qelos) {
    const { password } = authentication;
    await setSecret(tenant, `integration-source-${kind}-${authId}`, { password });
    return authId;
  }

  if (kind === IntegrationSourceKind.OpenAI) {
    const { token } = authentication;
    await setSecret(tenant, `integration-source-${kind}-${authId}`, { token });
    return authId;
  }

  if (kind === IntegrationSourceKind.LinkedIn) {
    const { clientSecret } = authentication;
    await setSecret(tenant, `integration-source-${kind}-${authId}`, { clientSecret });
    return authId;
  }

  return;
}
