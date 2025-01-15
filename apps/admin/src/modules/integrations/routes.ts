import EmptyRoute from '@/modules/core/components/layout/EmptyRoute.vue';

export const integrationsRoutes = {
  path: 'integrations',
  component: EmptyRoute,
  redirect: { name: 'integrations-sources' },
  children: [
    {
      path: '',
      name: 'integrations-kinds',
      component: async () => (await import('@/modules/integrations/IntegrationsKinds.vue')).default,
    },
    {
      path: ':kind/sources',
      name: 'integrations-sources',
      component: async () => (await import('@/modules/integrations/IntegrationsSources.vue')).default,
    },
    {
      path: ':kind/operations',
      name: 'integrations-operations',
      component: async () => (await import('@/modules/integrations/IntegrationsOperations.vue')).default
    }
  ]
}