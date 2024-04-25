import {internalServicesSecret} from '../../config';
import {service} from '@qelos/api-kit';
import {cacheManager} from './cache-manager';

const authService = service('AUTH', {port: process.env.AUTH_SERVICE_PORT || 9000});

function callAuthService(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', tenant: string, data?: any) {
  return authService({
    headers: {internal_secret: internalServicesSecret, tenant},
    method,
    data,
    url
  })
    .then((axiosRes: any) => axiosRes.data)
}

export function getUsers(tenant: string, {email, exact = false}) {
  return cacheManager.wrap(`plugins:users:${tenant}:${email}:${!!exact}`, () => {
    return callAuthService(`/internal-api/users?email=${email}` + (exact ? '&exact=true' : ''), 'GET', tenant).then(JSON.stringify)
  }).then(JSON.parse);
}

export function createUser(tenant: string, {email, password, roles, firstName}) {
  return callAuthService('/internal-api/users', 'POST', tenant, {email, password, roles, firstName});
}

export function updateUser(tenant: string, userId: string, {password, roles, firstName}) {
  cacheManager.setItem(`plugins:user:${tenant}:${userId}`, "{}", {ttl: 1}).catch();
  return callAuthService('/internal-api/users/' + userId, 'PUT', tenant, {password, roles, firstName});
}

export function removeUser(tenant: string, userId: string) {
  return callAuthService('/internal-api/users/' + userId, 'DELETE', tenant)
}

export function getUser(tenant: string, userId: string) {
  return cacheManager.wrap(`plugins:user:${tenant}:${userId}`, () => {
    return callAuthService('/internal-api/users/' + userId, 'GET', tenant).then(JSON.stringify)
  }).then(JSON.parse);
}