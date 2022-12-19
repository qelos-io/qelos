import {computed, watch} from 'vue';
import {RouteRecord, useRouter} from 'vue-router';
import {defineStore, storeToRefs} from 'pinia';
import {usePluginsList} from './plugins-list';
import MicroFrontendPage from '../MicroFrontendPage.vue';
import {authStore} from '@/modules/core/store/auth';
import {IMicroFrontend} from '@/services/types/plugin';

function getMfeUrl(mfe: IMicroFrontend): string {
  if (!mfe.callbackUrl) {
    return mfe.url;
  }
  return `/api/plugins/${mfe.pluginId}/callback?returnUrl=` + mfe.url;
}

export const usePluginsMicroFrontends = defineStore('plugins-micro-frontends', function usePluginsMicroFrontends() {
  const {plugins} = storeToRefs(usePluginsList());
  const router = useRouter();

  const userRoles = computed(() => authStore.user?.roles || []);

  const microFrontends = computed(() => {
    const data = {
      navBar: {
        top: [{key: '', items: [], priority: 99999}],
        bottom: [{key: '', items: [], priority: 99999}]
      },
      modals: {} as Record<string, IMicroFrontend>,
    };
    if (!plugins.value) {
      return data;
    }
    return plugins.value.reduce((allMFEs, plugin) => {
      const groups = plugin.navBarGroups?.reduce((map, group) => {
        map[group.key] = group;
        return map;
      }, {}) || {};
      plugin.microFrontends?.filter(frontend =>
        frontend.active &&
        (!(frontend.roles || frontend.route?.roles) || (frontend.roles || frontend.route.roles)
          .some(role => role === '*' || userRoles.value.includes(role)))
      )
        .forEach(frontend => {
          if (frontend.route) {
            frontend.callbackUrl = plugin.callbackUrl;
            frontend.pluginId = plugin._id;
            const stackTo = frontend.route.navBarPosition === 'top' ? allMFEs.navBar.top : allMFEs.navBar.bottom;
            if (frontend.route.group) {
              const groupTo = stackTo.find(group => group.key === frontend.route.group);
              if (groupTo) {
                groupTo.items.push(frontend);
              } else {
                stackTo.unshift({
                  ...groups[frontend.route.group],
                  items: [frontend]
                })
              }
            } else {
              stackTo[stackTo.length - 1].items.push(frontend); // add to the un-grouped items;
            }
          } else if (frontend.modal) {
            allMFEs.modals[frontend.modal.name] = frontend;
          }
        });

      const sortByPriority = (a, b) => (a.priority || 99999) - (b.priority || 99999);
      allMFEs.navBar.top = allMFEs.navBar.top.sort(sortByPriority);
      allMFEs.navBar.bottom = allMFEs.navBar.bottom.sort(sortByPriority);
      return allMFEs;
    }, data)
  });

  const unwatch = watch(microFrontends, ({navBar: {top, bottom}}) => {
    [
      ...top.map(group => group.items).flat(),
      ...bottom.map(group => group.items).flat()
    ].forEach(mfe => {
      const route = {
        name: `plugin.${mfe.name}`,
        path: mfe.route.path,
        component: mfe.url ? MicroFrontendPage : async () => (await import(`@/pre-designed/${mfe.use}.vue`)).default,
        meta: null
      }
      if (mfe.url) {
        route.meta = {
          roles: mfe.roles || mfe.route.roles || ['*'],
          mfeUrl: getMfeUrl(mfe),
          origin: new URL(mfe.url).origin
        }
      } else {
        route.meta = {
          roles: mfe.roles || mfe.route.roles || ['*'],
          fetchUrl: '',
        }
      }
      router.addRoute('playPlugin', route)
    })
    router.removeRoute('defaultPluginPlaceholder');
    router.push(router.currentRoute.value.fullPath);
    unwatch();
  });

  return {
    navBar: computed(() => microFrontends.value.navBar),
    modals: computed(() => microFrontends.value.modals),
  }
})
