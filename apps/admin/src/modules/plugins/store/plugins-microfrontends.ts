import { computed, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { defineStore, storeToRefs } from 'pinia';
import { usePluginsList } from './plugins-list';
import MicroFrontendPage from '../MicroFrontendPage.vue';
import { authStore } from '@/modules/core/store/auth';
import { IMicroFrontend } from '@/services/types/plugin';
import { getCrud } from '@/services/crud';
import { IMetaCrud } from '@/modules/plugins/store/types';
import { getAllStandardMetaCruds } from '@/services/meta-cruds';

function getMfeUrl(mfe: IMicroFrontend): string {
  if (!mfe.callbackUrl) {
    return mfe.url;
  }
  return `/api/plugins/${mfe.pluginId}/callback?returnUrl=` + btoa(mfe.url);
}

export const usePluginsMicroFrontends = defineStore('plugins-micro-frontends', function usePluginsMicroFrontends() {
  const { plugins, loaded } = storeToRefs(usePluginsList());
  const router = useRouter();

  const cruds = reactive<Record<string, IMetaCrud>>(getAllStandardMetaCruds());

  const userRoles = computed(() => authStore.user?.roles || []);
  const userWsRoles = computed(() => authStore.user?.workspace?.roles || []);

  // const isWorkspacesActive = toRef(useWsConfiguration(), 'isActive');

  const filterMfeByRoles = mfe => {
    const routeRoles = mfe.roles || mfe.route?.roles;
    const routeWsRoles = mfe.workspaceRoles;
    return mfe.active &&
      (!routeRoles?.length || routeRoles.some(role => role === '*' || userRoles.value.includes(role))) &&
      (!routeWsRoles?.length || routeWsRoles.some(role => role === '*' || userWsRoles.value.includes(role)))
  }

  const microFrontends = computed(() => {
    const data = {
      navBar: {
        'top': [{ key: '', items: [], priority: 99999 }],
        'bottom': [{ key: '', items: [], priority: 99999 }],
        'user-dropdown': [{ key: '', items: [], priority: 99999 }],
      },
      modals: {} as Record<string, IMicroFrontend>,
      onlyRoutes: [] as IMicroFrontend[]
    };
    if (!plugins.value) {
      return data;
    }
    return plugins.value.reduce((allMFEs, plugin) => {
      const groups = plugin.navBarGroups?.reduce((map, group) => {
        map[group.key] = group;
        return map;
      }, {}) || {};
      plugin.microFrontends?.filter(filterMfeByRoles).forEach(mfe => {
        if (mfe.url === '-') {
          delete mfe.url;
        }
        if (mfe.crud) {
          mfe.crudData = plugin.cruds.find(crud => crud.name === mfe.crud);
        }
        if (mfe.route) {
          mfe.callbackUrl = plugin.callbackUrl;
          mfe.pluginId = plugin._id;
          mfe.pluginApiPath = plugin.apiPath;
          if (allMFEs.navBar[mfe.route.navBarPosition as string]) {
            const stackTo = allMFEs.navBar[mfe.route.navBarPosition as string];
            // grouped routes in nav bar
            if (mfe.route.group) {
              const groupTo = stackTo.find(group => group.key === mfe.route.group);
              if (groupTo) {
                groupTo.items.push(mfe);
              } else {
                stackTo.unshift({
                  ...groups[mfe.route.group],
                  items: [mfe]
                })
              }
            } else {
              stackTo[stackTo.length - 1].items.push(mfe); // add to the un-grouped items;
            }
          } else {
            allMFEs.onlyRoutes.push(mfe);
          }
        } else if (mfe.modal) { // modals micro frontends
          allMFEs.modals[mfe.modal.name] = mfe;
        }
      });

      const sortByPriority = (a, b) => (a.priority || 99999) - (b.priority || 99999);
      allMFEs.navBar.top = allMFEs.navBar.top.sort(sortByPriority);
      allMFEs.navBar.bottom = allMFEs.navBar.bottom.sort(sortByPriority);
      allMFEs.navBar['user-dropdown'] = allMFEs.navBar['user-dropdown'].sort(sortByPriority);
      return allMFEs;
    }, data)
  });

  const initiateRoutes = ({ navBar, onlyRoutes }) => {
    Object.values(navBar)
      .map((area: { items: IMicroFrontend[] }[]) => area.map(group => group.items).flat())
      .flat()
      .concat(onlyRoutes as IMicroFrontend[])
      .forEach((mfe: IMicroFrontend) => {
        const route = {
          name: `plugin.${mfe.route.name}`,
          path: mfe.route.path,
          component: mfe.url ? MicroFrontendPage : async () => (await import(`../../../pre-designed/${mfe.use}.vue`)).default,
          meta: null
        }
        const roles = mfe.roles || mfe.route.roles || ['*'];
        const workspaceRoles = mfe.workspaceRoles || ['*'];
        if (mfe.url) {
          route.meta = {
            roles,
            workspaceRoles,
            mfeUrl: getMfeUrl(mfe),
            origin: mfe.url ? new URL(mfe.url).origin : undefined
          }
        } else {
          route.meta = {
            roles,
            workspaceRoles,
            mfe,
            searchQuery: mfe.searchQuery,
            searchPlaceholder: mfe.searchPlaceholder,
            navigateAfterSubmit: mfe.navigateAfterSubmit,
            clearAfterSubmit: mfe.clearAfterSubmit,
            crud: mfe.crudData,
            screenRequirements: mfe.requirements,
          }
          if (mfe.crudData && !cruds[mfe.crudData.name]) {
            cruds[mfe.crudData.name] = {
              api: getCrud(`/api/on/${mfe.pluginApiPath}/${mfe.crudData.name}`),
              identifierKey: mfe.crudData.identifierKey,
              navigateAfterSubmit: mfe.navigateAfterSubmit,
              clearAfterSubmit: mfe.clearAfterSubmit,
            };
          }
        }
        router.addRoute('playPlugin', route)
      })
    router.removeRoute('defaultPluginPlaceholder');
    router.removeRoute('defaultPluginPlaceholderSecond');
    router.push(router.currentRoute.value.fullPath);
  }

  if (loaded.value) {
    initiateRoutes(microFrontends.value);
  } else {
    const unwatch = watch(microFrontends, (newVal) => {
      initiateRoutes(newVal);
      unwatch();
    });
  }

  return {
    navBar: computed(() => microFrontends.value.navBar),
    modals: computed(() => microFrontends.value.modals),
    cruds,
  }
})
