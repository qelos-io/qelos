import EmptyRoute from '../core/components/layout/EmptyRoute.vue'

const usersRoutes = {
  path: 'users',
  redirect: { name: 'users' },
  component: EmptyRoute,
  children: [
    {
      path: '',
      name: 'users',
      meta: { roles: ['admin'], searchQuery: true },
      component: async () => (await import('./Users.vue')).default,
    },
    {
      path: 'me',
      name: 'userProfile',
      component: async () => (await import('./EditProfile.vue')).default,
      children: [
        {
          path: '',
          name: 'updateProfile',
          component: async () => (await import('./tabs/GeneralTab.vue')).default,
        },
        {
          path: 'payments',
          name: 'userPayments',
          component: async () => (await import('./tabs/PaymentsTab.vue')).default,
        },
        {
          path: 'api-tokens',
          name: 'userApiTokens',
          component: async () => (await import('./tabs/ApiTokensTab.vue')).default,
        }
      ]
    },
    {
      path: 'new',
      name: 'createUser',
      component: async () => (await import('./CreateUser.vue')).default
    },
    {
      path: ':userId',
      name: 'editUser',
      component: async () => (await import('./EditUser.vue')).default,
      meta: { roles: ['admin'] },
    }
  ]
}

export default usersRoutes
