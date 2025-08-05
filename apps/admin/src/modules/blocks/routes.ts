import {RouteRecordRaw} from 'vue-router'
import EmptyRoute from '../core/components/layout/EmptyRoute.vue'

export const blocksRoutes: RouteRecordRaw = {
  path: 'admin/blocks',
  redirect: {name: 'blocks'},
  component: EmptyRoute,
  children: [
    {
      path: '',
      name: 'blocks',
      component: async () => (await import('./Blocks.vue')).default
    },
    {
      path: 'new',
      name: 'createBlock',
      component: async () => (await import('./CreateBlock.vue')).default
    },
    {
      path: ':blockId',
      name: 'editBlock',
      component: async () => (await import('./EditBlock.vue')).default
    }
  ]
}

export const componentsRoutes: RouteRecordRaw = {
  path: 'admin/components',
  redirect: {name: 'components'},
  component: EmptyRoute,
  children: [
    {
      path: '',
      name: 'components',
      component: async () => (await import('./ComponentsPage.vue')).default
    },
    {
      path: 'new',
      name: 'createComponent',
      component: async () => (await import('./CreateComponentPage.vue')).default
    },
    {
      path: ':componentId',
      name: 'editComponent',
      component: async () => (await import('./EditComponentPage.vue')).default
    }
  ]
}