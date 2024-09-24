import { computed, ref, toRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { IScreenRequirement } from '@qelos/global-types'
import { api, getCallData } from '@/services/api';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import Sdk from '@/services/sdk';

export const useScreenRequirementsStore = defineStore('screen-requirements', function useScreenRequirements() {
  const route = useRoute()
  const mfes = usePluginsMicroFrontends();
  const cruds = toRef(mfes, 'cruds');
  const requirements = ref()

  function getBlueprintCacheKey(name: string, identifier?: string) {
    return identifier ? `blueprint:${name}:single:${identifier}` : `blueprint:${name}:all`
  }

  const cachedDispatchers = {}

  let currentDispatchers = {}

  const reloadRequirements = () => {
    const reqs = route.meta.screenRequirements;
    if (!(reqs instanceof Array && reqs.length)) {
      requirements.value = {}
      return;
    }
    currentDispatchers = {}
    requirements.value = reqs.reduce((all, item: IScreenRequirement) => {
      if (item.fromCrud) {
        const api = cruds.value[item.fromCrud.name]?.api;
        if (api && item.fromCrud.identifier) {
          const cachedKey = `crud:${item.fromCrud.name}:single:${item.fromCrud.identifier}`;
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(() => api.getOne(item.fromCrud.identifier), null)
          }
          currentDispatchers[cachedKey] = cachedDispatchers[cachedKey];
          all[item.key] = cachedDispatchers[cachedKey];
        } else if (api) {
          const cachedKey = `crud:${item.fromCrud.name}:all`;
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(() => api.getAll(), [])
          }
          currentDispatchers[cachedKey] = cachedDispatchers[cachedKey];
          all[item.key] = cachedDispatchers[cachedKey];
        }
      } else if (item.fromHTTP) {
        const method = (item.fromHTTP.method || 'get').toLowerCase();
        const cachedKey = `http:${method}:${item.fromHTTP.uri}`;
        if (cachedDispatchers[cachedKey]) {
          cachedDispatchers[cachedKey].retry();
        } else {
          cachedDispatchers[cachedKey] = useDispatcher(() => api.request({
            method,
            url: item.fromHTTP.uri,
            params: item.fromHTTP.query
          }).then(getCallData), null)
        }
        currentDispatchers[cachedKey] = cachedDispatchers[cachedKey];
        all[item.key] = cachedDispatchers[cachedKey];
      } else if (item.fromBlueprint) {
        const entitiesOfBlueprint = Sdk.blueprints.entitiesOf(item.fromBlueprint.name)
        if (item.fromBlueprint.identifier) {
          const cachedKey = getBlueprintCacheKey(item.fromBlueprint.name, item.fromBlueprint.identifier);
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(() => entitiesOfBlueprint.getEntity(item.fromBlueprint.identifier), null)
          }
          currentDispatchers[cachedKey] = cachedDispatchers[cachedKey];
          all[item.key] = cachedDispatchers[cachedKey];
        } else {
          const cachedKey = getBlueprintCacheKey(item.fromBlueprint.name);
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].metadata.value = item.fromBlueprint;
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(({ query }) => entitiesOfBlueprint.getList(query), [], false, item.fromBlueprint)
          }
          currentDispatchers[cachedKey] = cachedDispatchers[cachedKey];
          all[item.key] = cachedDispatchers[cachedKey];
        }
      } else if (item.fromData) {
        all[item.key] = ref(item.fromData);
      }

      return all
    }, {})
  }

  watch(() => [route.meta.screenRequirements, mfes.navBar, mfes.modals, mfes.cruds], reloadRequirements, { immediate: true })

  const isRequirementsLoaded = computed(() => {
    const hasEmptyRequirement = (route.meta.screenRequirements as IScreenRequirement[] || [])
      .map((item: IScreenRequirement) => item.key)
      .some(key => typeof requirements.value[key] === 'undefined')
    return !hasEmptyRequirement;
  })

  const reloadBlueprintRequirements = (name: string) => {
    const key = getBlueprintCacheKey(name);
    if (cachedDispatchers[key]) {
      cachedDispatchers[key].retry();
    }
  }

  return {
    isRequirementsLoaded,
    requirements,
    reloadRequirements,
    reloadBlueprintRequirements
  }
})