import EmptyRoute from '@/modules/core/components/layout/EmptyRoute.vue';


export const managePluginsRoutes = {
  path: 'plugins',
  component: EmptyRoute,
  redirect: { name: 'plugins' },
  children: [
    {
      path: '',
      name: 'plugins',
      component: async () => (await import('./Plugins.vue')).default
    },
    {
      path: 'new',
      name: 'createPlugin',
      component: async () => (await import('./CreatePlugin.vue')).default
    },
    {
      path: ':pluginId',
      name: 'editPlugin',
      component: async () => (await import('./EditPlugin.vue')).default
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
  children: [{
    name: 'defaultAdminPluginPlaceholder',
    path: ':allGuest',
    component: EmptyRoute,
  }, {
    name: 'defaultAdminPluginPlaceholderSecond',
    path: ':allGuest/:other',
    component: EmptyRoute,
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
  }, {
    name: 'defaultGuestPluginPlaceholderSecond',
    path: ':allGuest/:other',
    component: EmptyRoute,
  }]
};
