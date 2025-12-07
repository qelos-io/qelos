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

  if (
    kind === IntegrationSourceKind.OpenAI
  ) {
    const { token } = authentication;
    if (token !== undefined) {
      await setSecret(tenant, `integration-source-${kind}-${authId}`, { token });
    } else {
      console.warn(`Token not provided for ${kind} source with authId ${authId}. Secret not stored/updated.`);
    }
    return authId;
  }

  if (
    kind === IntegrationSourceKind.ClaudeAi ||
    kind === IntegrationSourceKind.Gemini
  ) {
    const { token } = authentication;
    if (token !== undefined) {
      await setSecret(tenant, `integration-source-${kind}-${authId}`, { token });
    } else {
      console.warn(`Token not provided for ${kind} source with authId ${authId}. Secret not stored/updated.`);
    }
    return authId;
  }

  if (kind === IntegrationSourceKind.N8n) {
    const { apikey } = authentication;
    await setSecret(tenant, `integration-source-${kind}-${authId}`, { apikey });
    return authId;
  }

  if (kind === IntegrationSourceKind.LinkedIn || kind === IntegrationSourceKind.Facebook || kind === IntegrationSourceKind.Google || kind === IntegrationSourceKind.GitHub) {
    const { clientSecret } = authentication;
    if (!clientSecret) {
      return; // No secret to store
    }
    await setSecret(tenant, `integration-source-${kind}-${authId}`, { clientSecret });
    return authId;
  }

  if (kind === IntegrationSourceKind.Http) {
    const { securedHeaders = {} } = authentication;
    if (Object.values(securedHeaders).some(v => typeof v !== 'string')) {
      throw new Error('Invalid secured headers')
    }
    await setSecret(tenant, `integration-source-${kind}-${authId}`, { securedHeaders });
    return authId;
  }

  if (kind === IntegrationSourceKind.Email) {
    const { password } = authentication;
    await setSecret(tenant, `integration-source-${kind}-${authId}`, { password });
    return authId;
  }

  return;
}

export async function removeEncryptedSourceAuthentication(tenant: string, kind: IntegrationSourceKind, authId: string) {
  await setSecret(tenant, `integration-source-${kind}-${authId}`, null);
}