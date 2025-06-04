import { FastifyRequest } from 'fastify/types/request';

export const handlers = {
  refreshToken: [],
  newTenant: [],
  manifest: [],
  storeUser: [],
  callback: [],
  frontendAuth: [],
  frontendUnAuth: [],
}
export type StandardPayload = { sub: string, identifier: string };

export type DataWithPayload<T> = { payload: T & StandardPayload };

export type FrontendAuthorizationPayload = { code: string | number, token: string }

export type NewTenantParams = {
  username: string;
  password: string;
  appUrl: string;
}

export type RefreshTokenHandler<T> = (tokenPayload: T & StandardPayload, request: FastifyRequest) => void | DataWithPayload<T> | Promise<void | DataWithPayload<T>>
export type NewTenantHandler<T> = (params: NewTenantParams, request: FastifyRequest) => void | DataWithPayload<T> | Promise<void | DataWithPayload<T>>

export type FrontendAuthorizationHandler = ({
                                              returnUrl,
                                              user,
                                              tenant
                                            }: {
                                              returnUrl: string;
                                              user: any;
                                              tenant: any;
                                            }, request: FastifyRequest) => void | FrontendAuthorizationPayload | Promise<void | FrontendAuthorizationPayload>;
export type FrontendUnAuthorizationHandler = ({ user, tenant }) => any;

export function onRefreshToken<T = any>(handler: RefreshTokenHandler<T>) {
  handlers.refreshToken.push(handler);
}

export function onNewTenant<T = any>(handler: NewTenantHandler<T>) {
  handlers.newTenant.push(handler);
}

export function onManifest(handler: (request: FastifyRequest) => any) {
  handlers.manifest.push(handler);
}

export function onStoreUser(handler) {
  handlers.storeUser.push(handler);
}

export function onCallback(handler: ({
                                       user,
                                       returnUrl
                                     }, request: FastifyRequest) => void | string | Promise<void | string>) {
  handlers.callback.push(handler);
}

export function onFrontendAuthorization(handler: FrontendAuthorizationHandler) {
  handlers.frontendAuth.push(handler);
}

export function onFrontendUnAuthorization(handler: FrontendUnAuthorizationHandler) {
  handlers.frontendUnAuth.push(handler);
}

export default handlers;
