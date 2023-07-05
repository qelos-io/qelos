import EmptyRoute from '../core/components/layout/EmptyRoute.vue'
import { RouteRecordRaw } from 'vue-router'

const workspacesRoutes: RouteRecordRaw = {
  path: 'workspaces',
  redirect: { name: 'workspaces' },
  component: EmptyRoute,
  children: [
    {
      path: '',
      name: 'workspaces',
      component: async () => (await import('./Workspaces.vue')).default
    },
    {
      path: 'new',
      name: 'createWorkspace',
      component: EmptyRoute
    },
  ]
}

export default workspacesRoutes
