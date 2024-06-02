import EmptyRoute from '../core/components/layout/EmptyRoute.vue'

const noCodeRoutes = {
  path: 'no-code',
  redirect: { name: 'no-code' },
  meta: { roles: ['admin'] },
  component: EmptyRoute,
  children: [
    {
      name: 'createBlueprint',
      path: 'create-blueprint',
      component: EmptyRoute
    },
    {
      name: 'blueprints',
      path: 'blueprints',
      component: async () => (await import('./Blueprints.vue')).default
    },
  ]
}

export default noCodeRoutes
