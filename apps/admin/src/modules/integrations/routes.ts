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
      path: 'new',
      name: 'integration-new',
      component: async () => (await import('@/modules/integrations/IntegrationEditorPage.vue')).default,
      meta: { roles: ['admin'] },
    },
    {
      path: 'edit/:integrationId',
      name: 'integration-edit',
      component: async () => (await import('@/modules/integrations/IntegrationEditorPage.vue')).default,
      meta: { roles: ['admin'] },
    },
    {
      path: ':kind/sources',
      name: 'integrations-sources',
      component: async () => (await import('@/modules/integrations/IntegrationsSources.vue')).default,
      meta: { roles: ['admin'] },
    }
  ]
}