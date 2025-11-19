import EmptyRoute from '@/modules/core/components/layout/EmptyRoute.vue';

export const integrationsRoutes = {
  path: 'integrations',
  component: EmptyRoute,
  redirect: { name: 'integrations' },
  children: [
    {
      path: '',
      name: 'integrations',
      component: async () => (await import('@/modules/integrations/Integrations.vue')).default,
      meta: {
        roles: ['admin'],
        searchQuery: true,
        searchPlaceholder: 'Search integrations...'
      },
    },
    {
      path: ':kind/sources',
      name: 'integrations-sources',
      component: async () => (await import('@/modules/integrations/IntegrationsSources.vue')).default,
      meta: { roles: ['admin'] },
    }
  ]
}