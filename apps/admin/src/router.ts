import {createRouter, createWebHistory} from 'vue-router'
import Authenticated from './modules/core/Authenticated.vue'
import Home from './modules/core/Home.vue'
import assetsRoutes from './modules/assets/routes'
import usersRoutes from './modules/users/routes'
import configurationsRoutes from './modules/configurations/routes'
import {authStore, fetchAuthUser} from './modules/core/store/auth'
import draftsRoutes from './modules/drafts/routes';
import blocksRoutes from './modules/blocks/routes';
import layoutsRoutes from '@/modules/layouts/routes';
import {managePluginsRoutes, playRoutes} from '@/modules/plugins/routes';
import workspacesRoutes from '@/modules/workspaces/routes';
import noCodeRoutes from '@/modules/no-code/routes';

// @ts-ignore
const BASE = import.meta.env.BASE_URL || '/';

const router = createRouter({
  history: createWebHistory(BASE),
  routes: [
    {
      path: '/',
      name: 'authenticated',
      component: Authenticated,
      children: [
        {
          path: '/',
          name: 'home',
          component: Home
        },
        configurationsRoutes,
        assetsRoutes,
        usersRoutes,
        draftsRoutes,
        blocksRoutes,
        layoutsRoutes,
        workspacesRoutes,
        noCodeRoutes,
        managePluginsRoutes,
        playRoutes,
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: async () => (await import('./modules/core/Login.vue')).default,
      meta: {
        guest: true
      }
    }
  ]
})

const EVERY_ROLE_PATTERN = '*';
const checkValidRole = role => role === EVERY_ROLE_PATTERN || authStore.user.roles.includes(role)
const checkValidWsRole = role => role === EVERY_ROLE_PATTERN || (authStore.user.workspace && authStore.user.workspace.roles?.includes(role))
router.beforeEach(async (to, from, next) => {
  if (to.name === 'login' || to.meta.guest || localStorage.refresh_token) {
    return next()
  }
  if (await fetchAuthUser() && authStore.user) {
    if (
      (!to.meta.roles || (to.meta.roles as string[]).some(checkValidRole)) &&
      (!to.meta.workspaceRoles || (to.meta.workspaceRoles as string[]).some(checkValidWsRole))
    ) {
      return next()
    } else {
      return next(from);
    }
  }
  next({
    name: 'login'
  })
})

export default router
