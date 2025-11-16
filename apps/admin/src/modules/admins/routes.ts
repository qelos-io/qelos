import {RouteRecordRaw} from 'vue-router'
import EmptyRoute from '../core/components/layout/EmptyRoute.vue'

export const adminLogRoutes: RouteRecordRaw = {
  path: '/admin/log',
  redirect: {name: 'log'},
  component: EmptyRoute,
  children: [
    {
      path: '',
      name: 'log',
      component: async () => (await import('./Log.vue')).default,
      meta: { roles: ['admin'] },
    }
  ]
}