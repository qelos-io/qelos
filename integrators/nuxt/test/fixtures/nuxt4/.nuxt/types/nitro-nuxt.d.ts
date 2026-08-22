
/// <reference path="nitro-layouts.d.ts" />
/// <reference path="shared-app.config.d.ts" />
/// <reference path="runtime-config.d.ts" />
/// <reference path="../../../../../../../node_modules/.pnpm/@nuxt+nitro-server@4.5.2_199c381bd2f81d2c6ac3948f01e343f4/node_modules/@nuxt/nitro-server/dist/augments.d.mts" />
/// <reference path="middleware.d.ts" />
/// <reference path="../schema/nuxt.schema.d.ts" />

import type { RuntimeConfig } from 'nuxt/schema'
import type { H3Event } from 'h3'
import type { LogObject } from 'consola'
import type { NuxtIslandContext, NuxtIslandResponse, NuxtRenderChunkContext, NuxtRenderCloseContext, NuxtRenderHTMLContext, NuxtRenderRouteContext } from '#app/types'

declare module 'nitropack' {
  interface NitroRuntimeConfigApp {
    buildAssetsDir: string
    cdnURL: string
  }
  interface NitroRuntimeConfig extends RuntimeConfig {}
  interface NitroRouteConfig {
    ssr?: boolean
    streaming?: boolean
    noScripts?: boolean
    /** @deprecated Use `noScripts` instead */
    experimentalNoScripts?: boolean
  }
  interface NitroRouteRules {
    ssr?: boolean
    streaming?: boolean
    noScripts?: boolean
    /** @deprecated Use `noScripts` instead */
    experimentalNoScripts?: boolean
    appMiddleware?: Record<string, boolean>
    appLayout?: string | false
  }
  interface NitroRuntimeHooks {
    'dev:ssr-logs': (ctx: { logs: LogObject[], path: string }) => void | Promise<void>
    'render:html': (htmlContext: NuxtRenderHTMLContext, context: { event: H3Event, streaming?: boolean }) => void | Promise<void>
    'render:html:chunk': (chunkContext: NuxtRenderChunkContext, context: { event: H3Event }) => void | Promise<void>
    'render:html:close': (closeContext: NuxtRenderCloseContext, context: { event: H3Event }) => void | Promise<void>
    'render:route': (renderRouteContext: NuxtRenderRouteContext, context: { event: H3Event }) => void | Promise<void>
    'render:island': (islandResponse: NuxtIslandResponse, context: { event: H3Event, islandContext: NuxtIslandContext }) => void | Promise<void>
  }
}
declare module 'nitropack/types' {
  interface NitroRuntimeConfigApp {
    buildAssetsDir: string
    cdnURL: string
  }
  interface NitroRuntimeConfig extends RuntimeConfig {}
  interface NitroRouteConfig {
    ssr?: boolean
    streaming?: boolean
    noScripts?: boolean
    /** @deprecated Use `noScripts` instead */
    experimentalNoScripts?: boolean
  }
  interface NitroRouteRules {
    ssr?: boolean
    streaming?: boolean
    noScripts?: boolean
    /** @deprecated Use `noScripts` instead */
    experimentalNoScripts?: boolean
    appMiddleware?: Record<string, boolean>
    appLayout?: string | false
  }
  interface NitroRuntimeHooks {
    'dev:ssr-logs': (ctx: { logs: LogObject[], path: string }) => void | Promise<void>
    'render:html': (htmlContext: NuxtRenderHTMLContext, context: { event: H3Event, streaming?: boolean }) => void | Promise<void>
    'render:html:chunk': (chunkContext: NuxtRenderChunkContext, context: { event: H3Event }) => void | Promise<void>
    'render:html:close': (closeContext: NuxtRenderCloseContext, context: { event: H3Event }) => void | Promise<void>
    'render:route': (renderRouteContext: NuxtRenderRouteContext, context: { event: H3Event }) => void | Promise<void>
    'render:island': (islandResponse: NuxtIslandResponse, context: { event: H3Event, islandContext: NuxtIslandContext }) => void | Promise<void>
  }
}
