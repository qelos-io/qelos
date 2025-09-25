import EmptyRoute from '@/modules/core/components/layout/EmptyRoute.vue';


export const managePluginsRoutes = {
  path: 'plugins',
  component: EmptyRoute,
  redirect: { name: 'plugins' },
  meta: { roles: ['admin'] },
  children: [
    {
      path: '',
      name: 'plugins',
      component: async () => (await import('./Plugins.vue')).default,
      meta: { roles: ['admin'] },
    },
    {
      path: 'new',
      name: 'createPlugin',
      component: async () => (await import('./CreatePlugin.vue')).default,
      meta: { roles: ['admin'] },
    },
    {
      path: ':pluginId',
      name: 'editPlugin',
      component: async () => (await import('./EditPlugin.vue')).default,
      meta: { roles: ['admin'] },
    }
  ]
};

export const playRoutes = {
  path: '',
  name: 'playPlugin',
  component: EmptyRoute,
  children: [{
    name: 'defaultPluginPlaceholder',
    path: ':all',
    component: EmptyRoute,
  }, {
    name: 'defaultPluginPlaceholderSecond',
    path: ':all/:other',
    component: EmptyRoute,
  }]
};

export const adminRoutesScreenEditor = {
  path: 'screen-editor',
  name: 'screenEditor',
  component: EmptyRoute,
  meta: { roles: ['admin'] },
  children: [{
    name: 'defaultAdminPluginPlaceholder',
    path: ':allGuest',
    component: EmptyRoute,
    meta: { roles: ['admin'] },
  }, {
    name: 'defaultAdminPluginPlaceholderSecond',
    path: ':allGuest/:other',
    component: EmptyRoute,
    meta: { roles: ['admin'] },
  }]
}

export const playGuestRoutes = {
  path: '/',
  name: 'playGuestPlugin',
  component: EmptyRoute,
  children: [{
    name: 'defaultGuestPluginPlaceholder',
    path: ':allGuest',
    component: EmptyRoute,
    meta: { guest: true },
  }, {
    name: 'defaultGuestPluginPlaceholderSecond',
    path: ':allGuest/:other',
    component: EmptyRoute,
    meta: { guest: true },
  }]
};
