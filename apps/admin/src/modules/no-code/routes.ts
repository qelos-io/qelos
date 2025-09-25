import EmptyRoute from '../core/components/layout/EmptyRoute.vue';

const noCodeRoutes = {
  path: 'no-code',
  redirect: { name: 'no-code' },
  meta: { roles: ['admin'] },
  component: EmptyRoute,
  children: [
    {
      name: 'createBlueprint',
      path: 'create-blueprint',
      component: async () => (await import('./CreateBlueprint.vue')).default,
      meta: { roles: ['admin'] },
    },
    {
      name: 'editBlueprint',
      path: 'edit-blueprint/:blueprintIdentifier',
      component: async () => (await import('./EditBlueprint.vue')).default,
      meta: { roles: ['admin'] },
    },
    {
      name: 'blueprints',
      path: 'blueprints',
      meta: {
        searchQuery: true,
        searchPlaceholder: 'Search blueprints',
        roles: ['admin']
      },
      component: async () => (await import('./Blueprints.vue')).default,
    },
  ]
}

export default noCodeRoutes
