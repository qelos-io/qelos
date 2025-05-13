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
      component: async () => (await import('./CreateBlueprint.vue')).default
    },
    {
      name: 'editBlueprint',
      path: 'edit-blueprint/:blueprintIdentifier',
      component: async () => (await import('./EditBlueprint.vue')).default
    },
    {
      name: 'blueprints',
      path: 'blueprints',
      meta: {
        searchQuery: true,
        searchPlaceholder: 'Search blueprints',
      },
      component: async () => (await import('./Blueprints.vue')).default
    },
  ]
}

export default noCodeRoutes
