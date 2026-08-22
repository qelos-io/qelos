import type { ComputedRef, MaybeRef } from "vue";
import type { ComponentProps } from "../../../../../../../node_modules/.pnpm/vue-component-type-helpers@3.3.11/node_modules/vue-component-type-helpers/index.js";

declare module 'nuxt/app' {
  interface NuxtLayouts {
  }
  export type LayoutKey = keyof NuxtLayouts extends never ? string : keyof NuxtLayouts
  interface PageMeta {
    layout?: MaybeRef<LayoutKey | false> | ComputedRef<LayoutKey | false> | {
      [K in LayoutKey]: {
        name?: MaybeRef<K | false> | ComputedRef<K | false>
        props?: NuxtLayouts[K]
      }
    }[LayoutKey]
  }
}