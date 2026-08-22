declare global {
  const H3Error: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').H3Error
  const H3Event: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').H3Event
  const __buildAssetsURL: typeof import('../../../../../../../node_modules/.pnpm/@nuxt+nitro-server@4.5.2_4e5242e5caf11b2829f9ee551d4025c2/node_modules/@nuxt/nitro-server/dist/runtime/utils/paths').buildAssetsURL
  const __publicAssetsURL: typeof import('../../../../../../../node_modules/.pnpm/@nuxt+nitro-server@4.5.2_4e5242e5caf11b2829f9ee551d4025c2/node_modules/@nuxt/nitro-server/dist/runtime/utils/paths').publicAssetsURL
  const appendCorsHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').appendCorsHeaders
  const appendCorsPreflightHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').appendCorsPreflightHeaders
  const appendHeader: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').appendHeader
  const appendHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').appendHeaders
  const appendResponseHeader: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').appendResponseHeader
  const appendResponseHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').appendResponseHeaders
  const assertMethod: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').assertMethod
  const cachedEventHandler: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/cache').cachedEventHandler
  const cachedFunction: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/cache').cachedFunction
  const callNodeListener: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').callNodeListener
  const clearResponseHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').clearResponseHeaders
  const clearSession: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').clearSession
  const createApp: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').createApp
  const createAppEventHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').createAppEventHandler
  const createError: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').createError
  const createEvent: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').createEvent
  const createEventStream: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').createEventStream
  const createRouter: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').createRouter
  const defaultContentType: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').defaultContentType
  const defineAppConfig: typeof import('../../../../../../../node_modules/.pnpm/@nuxt+nitro-server@4.5.2_4e5242e5caf11b2829f9ee551d4025c2/node_modules/@nuxt/nitro-server/dist/runtime/utils/config').defineAppConfig
  const defineCachedEventHandler: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/cache').defineCachedEventHandler
  const defineCachedFunction: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/cache').defineCachedFunction
  const defineEventHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').defineEventHandler
  const defineLazyEventHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').defineLazyEventHandler
  const defineNitroErrorHandler: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/error/utils').defineNitroErrorHandler
  const defineNitroPlugin: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/plugin').defineNitroPlugin
  const defineNodeListener: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').defineNodeListener
  const defineNodeMiddleware: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').defineNodeMiddleware
  const defineRenderHandler: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/renderer').defineRenderHandler
  const defineRequestMiddleware: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').defineRequestMiddleware
  const defineResponseMiddleware: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').defineResponseMiddleware
  const defineRouteMeta: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/meta').defineRouteMeta
  const defineTask: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/task').defineTask
  const defineWebSocket: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').defineWebSocket
  const defineWebSocketHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').defineWebSocketHandler
  const deleteCookie: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').deleteCookie
  const dynamicEventHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').dynamicEventHandler
  const eventHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').eventHandler
  const fetchWithEvent: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').fetchWithEvent
  const fromNodeMiddleware: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').fromNodeMiddleware
  const fromPlainHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').fromPlainHandler
  const fromWebHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').fromWebHandler
  const getCookie: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getCookie
  const getHeader: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getHeader
  const getHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getHeaders
  const getMethod: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getMethod
  const getProxyRequestHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getProxyRequestHeaders
  const getQuery: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getQuery
  const getRequestFingerprint: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRequestFingerprint
  const getRequestHeader: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRequestHeader
  const getRequestHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRequestHeaders
  const getRequestHost: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRequestHost
  const getRequestIP: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRequestIP
  const getRequestPath: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRequestPath
  const getRequestProtocol: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRequestProtocol
  const getRequestURL: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRequestURL
  const getRequestWebStream: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRequestWebStream
  const getResponseHeader: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getResponseHeader
  const getResponseHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getResponseHeaders
  const getResponseStatus: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getResponseStatus
  const getResponseStatusText: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getResponseStatusText
  const getRouteRules: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/route-rules').getRouteRules
  const getRouterParam: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRouterParam
  const getRouterParams: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getRouterParams
  const getSession: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getSession
  const getValidatedQuery: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getValidatedQuery
  const getValidatedRouterParams: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').getValidatedRouterParams
  const handleCacheHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').handleCacheHeaders
  const handleCors: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').handleCors
  const isCorsOriginAllowed: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').isCorsOriginAllowed
  const isError: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').isError
  const isEvent: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').isEvent
  const isEventHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').isEventHandler
  const isMethod: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').isMethod
  const isPreflightRequest: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').isPreflightRequest
  const isStream: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').isStream
  const isWebResponse: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').isWebResponse
  const lazyEventHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').lazyEventHandler
  const nitroPlugin: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/plugin').nitroPlugin
  const parseCookies: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').parseCookies
  const promisifyNodeListener: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').promisifyNodeListener
  const proxyRequest: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').proxyRequest
  const readBody: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').readBody
  const readFormData: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').readFormData
  const readMultipartFormData: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').readMultipartFormData
  const readRawBody: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').readRawBody
  const readValidatedBody: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').readValidatedBody
  const removeResponseHeader: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').removeResponseHeader
  const runTask: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/task').runTask
  const sanitizeStatusCode: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').sanitizeStatusCode
  const sanitizeStatusMessage: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').sanitizeStatusMessage
  const sealSession: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').sealSession
  const send: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').send
  const sendError: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').sendError
  const sendIterable: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').sendIterable
  const sendNoContent: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').sendNoContent
  const sendProxy: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').sendProxy
  const sendRedirect: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').sendRedirect
  const sendStream: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').sendStream
  const sendWebResponse: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').sendWebResponse
  const serveStatic: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').serveStatic
  const setCookie: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').setCookie
  const setHeader: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').setHeader
  const setHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').setHeaders
  const setResponseHeader: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').setResponseHeader
  const setResponseHeaders: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').setResponseHeaders
  const setResponseStatus: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').setResponseStatus
  const splitCookiesString: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').splitCookiesString
  const toEventHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').toEventHandler
  const toNodeListener: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').toNodeListener
  const toPlainHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').toPlainHandler
  const toWebHandler: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').toWebHandler
  const toWebRequest: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').toWebRequest
  const unsealSession: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').unsealSession
  const updateSession: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').updateSession
  const useAppConfig: typeof import('../../../../../../../node_modules/.pnpm/@nuxt+nitro-server@4.5.2_4e5242e5caf11b2829f9ee551d4025c2/node_modules/@nuxt/nitro-server/dist/runtime/utils/app-config').useAppConfig
  const useBase: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').useBase
  const useEvent: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/context').useEvent
  const useNitroApp: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/app').useNitroApp
  const useRuntimeConfig: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/config').useRuntimeConfig
  const useSession: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').useSession
  const useStorage: typeof import('../../../../../../../node_modules/.pnpm/nitropack@2.13.4_oxc-parser_a69d7b4a72cf6c69182fb8e9db261da0/node_modules/nitropack/dist/runtime/internal/storage').useStorage
  const writeEarlyHints: typeof import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index').writeEarlyHints
}
// for type re-export
declare global {
  // @ts-ignore
  export type { EventHandler, EventHandlerRequest, EventHandlerResponse, EventHandlerObject, H3EventContext } from '../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index'
  import('../../../../../../../node_modules/.pnpm/h3@1.15.11/node_modules/h3/dist/index')
}
export { H3Event, H3Error, appendCorsHeaders, appendCorsPreflightHeaders, appendHeader, appendHeaders, appendResponseHeader, appendResponseHeaders, assertMethod, callNodeListener, clearResponseHeaders, clearSession, createApp, createAppEventHandler, createError, createEvent, createEventStream, createRouter, defaultContentType, defineEventHandler, defineLazyEventHandler, defineNodeListener, defineNodeMiddleware, defineRequestMiddleware, defineResponseMiddleware, defineWebSocket, defineWebSocketHandler, deleteCookie, dynamicEventHandler, eventHandler, fetchWithEvent, fromNodeMiddleware, fromPlainHandler, fromWebHandler, getCookie, getHeader, getHeaders, getMethod, getProxyRequestHeaders, getQuery, getRequestFingerprint, getRequestHeader, getRequestHeaders, getRequestHost, getRequestIP, getRequestPath, getRequestProtocol, getRequestURL, getRequestWebStream, getResponseHeader, getResponseHeaders, getResponseStatus, getResponseStatusText, getRouterParam, getRouterParams, getSession, getValidatedQuery, getValidatedRouterParams, handleCacheHeaders, handleCors, isCorsOriginAllowed, isError, isEvent, isEventHandler, isMethod, isPreflightRequest, isStream, isWebResponse, lazyEventHandler, parseCookies, promisifyNodeListener, proxyRequest, readBody, readFormData, readMultipartFormData, readRawBody, readValidatedBody, removeResponseHeader, sanitizeStatusCode, sanitizeStatusMessage, sealSession, send, sendError, sendIterable, sendNoContent, sendProxy, sendRedirect, sendStream, sendWebResponse, serveStatic, setCookie, setHeader, setHeaders, setResponseHeader, setResponseHeaders, setResponseStatus, splitCookiesString, toEventHandler, toNodeListener, toPlainHandler, toWebHandler, toWebRequest, unsealSession, updateSession, useBase, useSession, writeEarlyHints } from 'h3';
export { useNitroApp } from 'nitropack/runtime/internal/app';
export { useRuntimeConfig } from 'nitropack/runtime/internal/config';
export { defineNitroPlugin, nitroPlugin } from 'nitropack/runtime/internal/plugin';
export { defineCachedFunction, defineCachedEventHandler, cachedFunction, cachedEventHandler } from 'nitropack/runtime/internal/cache';
export { useStorage } from 'nitropack/runtime/internal/storage';
export { defineRenderHandler } from 'nitropack/runtime/internal/renderer';
export { defineRouteMeta } from 'nitropack/runtime/internal/meta';
export { getRouteRules } from 'nitropack/runtime/internal/route-rules';
export { useEvent } from 'nitropack/runtime/internal/context';
export { defineTask, runTask } from 'nitropack/runtime/internal/task';
export { defineNitroErrorHandler } from 'nitropack/runtime/internal/error/utils';
export { buildAssetsURL as __buildAssetsURL, publicAssetsURL as __publicAssetsURL } from 'C:/dev/qelos/qelos/node_modules/.pnpm/@nuxt+nitro-server@4.5.2_4e5242e5caf11b2829f9ee551d4025c2/node_modules/@nuxt/nitro-server/dist/runtime/utils/paths';
export { defineAppConfig } from 'C:/dev/qelos/qelos/node_modules/.pnpm/@nuxt+nitro-server@4.5.2_4e5242e5caf11b2829f9ee551d4025c2/node_modules/@nuxt/nitro-server/dist/runtime/utils/config';
export { useAppConfig } from 'C:/dev/qelos/qelos/node_modules/.pnpm/@nuxt+nitro-server@4.5.2_4e5242e5caf11b2829f9ee551d4025c2/node_modules/@nuxt/nitro-server/dist/runtime/utils/app-config';