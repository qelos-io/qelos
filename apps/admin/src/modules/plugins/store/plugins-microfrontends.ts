import {computed, watch} from 'vue';
import {useRouter} from 'vue-router';
import {defineStore, storeToRefs} from 'pinia';
import {usePluginsList} from './plugins-list';
import MicroFrontendPage from '../MicroFrontendPage.vue';
import {authStore} from '@/modules/core/store/auth';
import {IMicroFrontend} from '@/services/types/plugin';

function getMfeUrl(mfe: IMicroFrontend): string {
  if (!mfe.callbackUrl) {
    return mfe.url;
  }
  return `/api/plugins/${mfe.pluginId}/callback?returnUrl=` + btoa(mfe.url);
}

export const usePluginsMicroFrontends = defineStore('plugins-micro-frontends', function usePluginsMicroFrontends() {
  const {plugins, loaded} = storeToRefs(usePluginsList());
  const router = useRouter();

  const userRoles = computed(() => authStore.user?.roles || []);

  const microFrontends = computed(() => {
    const data = {
      navBar: {
        'top': [{key: '', items: [], priority: 99999}],
        'bottom': [{key: '', items: [], priority: 99999}],
        'user-dropdown': [{key: '', items: [], priority: 99999}],
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
      plugin.microFrontends?.filter(mfe =>
        mfe.active &&
        (!(mfe.roles || mfe.route?.roles) || (mfe.roles || mfe.route.roles)
          .some(role => role === '*' || userRoles.value.includes(role)))
      )
        .forEach(mfe => {
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

  const initiateRoutes = ({navBar, onlyRoutes}) => {
    Object.values(navBar)
      .map((area: { items: IMicroFrontend[] }[]) => area.map(group => group.items).flat())
      .flat()
      .concat(onlyRoutes as IMicroFrontend[])
      .forEach((mfe: IMicroFrontend) => {
        const route = {
          name: `plugin.${mfe.route.name}`,
          path: mfe.route.path,
          component: mfe.url ? MicroFrontendPage : async () => (await import(`@/pre-designed/${mfe.use}.vue`)).default,
          meta: null
        }
        const roles = mfe.roles || mfe.route.roles || ['*'];
        if (mfe.url) {
          route.meta = {
            roles,
            mfeUrl: getMfeUrl(mfe),
            origin: new URL(mfe.url).origin
          }
        } else {
          route.meta = {
            roles,
            mfe,
            crudBasePath: `/api/play/${mfe.pluginApiPath}/${mfe.crudData.name}`,
            crud: mfe.crudData,
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
  }
})
