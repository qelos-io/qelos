import { internalServicesSecret } from '../../config';
import { service } from '@qelos/api-kit';

const contentService = service('CONTENT', { port: process.env.CONTENT_SERVICE_PORT || 9001 });

export function callContentService(url: string, tenant: string, data?: any) {
  return contentService({
    headers: { internal_secret: internalServicesSecret, tenant },
    method: 'GET',
    data,
    url
  })
    .then((axiosRes: any) => axiosRes.data)
}