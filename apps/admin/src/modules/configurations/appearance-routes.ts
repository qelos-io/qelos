import { RouteRecordRaw } from 'vue-router'

const appearanceRoutes: RouteRecordRaw = {
  path: 'admin/appearance',
  name: 'appearance',
  meta: { roles: ['admin'], name: 'Appearance' },
  component: async () => (await import('./AppearanceSettings.vue')).default,
}

export default appearanceRoutes
