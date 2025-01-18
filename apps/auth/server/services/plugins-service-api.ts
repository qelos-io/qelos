import { internalServicesSecret } from '../../config';
import { service } from '@qelos/api-kit';

const pluginsService = service('PLUGINS', { port: process.env.PLUGINS_SERVICE_PORT || 9006 });

export function callPluginsService(url: string, tenant: string, data?: any) {
  return pluginsService({
    headers: { internal_secret: internalServicesSecret, tenant },
    method: 'GET',
    data,
    url
  })
    .then((axiosRes: any) => axiosRes.data)
}