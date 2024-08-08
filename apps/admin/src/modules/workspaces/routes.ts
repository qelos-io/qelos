import EmptyRoute from '../core/components/layout/EmptyRoute.vue'
import { RouteRecordRaw } from 'vue-router'

const workspacesRoutes: RouteRecordRaw = {
  path: "workspaces",
  redirect: { name: "workspaces" },
  component: EmptyRoute,
  meta: {},
  children: [
    {
      path: "",
      name: "workspaces",
      component: async () => (await import("./Workspaces.vue")).default,
    },
    {
      path: "new",
      name: "createWorkspace",
      component: async () => (await import("./CreateWorkspace.vue")).default,
    },
    {
      path: ':id',
      name: 'editWorkspace',
      component: async () => (await import('./EditWorkspace.vue')).default,
    }
  ],
};

export default workspacesRoutes
