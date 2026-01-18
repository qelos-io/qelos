import EmptyRoute from '../core/components/layout/EmptyRoute.vue'
import { RouteRecordRaw } from 'vue-router'

export const workspacesRoutes: RouteRecordRaw = {
  path: "workspaces",
  redirect: { name: "workspaces" },
  component: EmptyRoute,
  meta: {},
  children: [
    {
      path: "",
      name: "workspaces",
      component: async () => (await import("./MyWorkspaces.vue")).default,
    },
    {
      path: "new",
      name: "createMyWorkspace",
      component: async () => (await import("./CreateMyWorkspace.vue")).default,
    },
    {
      path: ':id',
      name: 'editMyWorkspace',
      redirect: { name: 'editMyWorkspaceGeneral' },
      component: async () => (await import('./EditMyWorkspace.vue')).default,
      children: [
        {
          path: 'general',
          name: 'editMyWorkspaceGeneral',
          component: async () => (await import('./tabs/GeneralTab.vue')).default,
        },
        {
          path: 'members',
          name: 'editMyWorkspaceMembers',
          component: async () => (await import('./tabs/MembersTab.vue')).default,
        },
        {
          path: 'payments',
          name: 'editMyWorkspacePayments',
          component: async () => (await import('./tabs/PaymentsTab.vue')).default,
        },
        {
          path: 'integrations',
          name: 'editMyWorkspaceIntegrations',
          component: async () => (await import('./tabs/IntegrationsTab.vue')).default,
        },
        {
          path: 'security',
          name: 'editMyWorkspaceSecurity',
          component: async () => (await import('./tabs/SecurityTab.vue')).default,
        },
        {
          path: 'advanced',
          name: 'editMyWorkspaceAdvanced',
          component: async () => (await import('./tabs/AdvancedTab.vue')).default,
        }
      ]
    }
  ],
};

export const adminWorkspacesRoutes: RouteRecordRaw = {
  path: "/admin/workspaces",
  redirect: { name: "adminWorkspaces" },
  component: EmptyRoute,
  meta: {},
  children: [
    {
      path: "",
      name: "adminWorkspaces",
      component: async () => (await import("./AdminWorkspaces.vue")).default,
      meta: {
        roles: ['admin'],
        searchQuery: true
      },
    },
    {
      path: "new",
      name: "adminCreateWorkspace",
      component: async () => (await import("./AdminCreateWorkspace.vue")).default,
      meta: { roles: ['admin'] },
    },
    {
      path: ':id',
      name: 'adminEditWorkspace',
      component: async () => (await import('./AdminEditWorkspace.vue')).default,
      meta: { roles: ['admin'] },
    }
  ],
};
