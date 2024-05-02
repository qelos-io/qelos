import {internalServicesSecret, secretsToken} from '../../config';
import {service} from '@qelos/api-kit';

const secretsService = service('SECRETS', {port: process.env.SECRETS_SERVICE_PORT || 9002});

function callSecretsService(url: string, tenant: string, key: string, value?: any) {
  return secretsService({
    headers: {internal_secret: internalServicesSecret, tenant},
    method: 'POST',
    data: {
      key,
      value,
      token: secretsToken
    },
    url
  })
    .then((axiosRes: any) => axiosRes.data)
}

export function getEncryptedData(tenant: string, itemId: string, forModel = 'user'): Promise<{ value: string }> {
  return callSecretsService('/api/secrets/get', tenant, `${forModel}-encrypted-data-${tenant}-${itemId}`)
}

export function setEncryptedData(tenant: string, itemId: string, value: string, forModel = 'user') {
  return callSecretsService('/api/secrets/set', tenant, `${forModel}-encrypted-data-${tenant}-${itemId}`, value)
}
