import { ref, toRef, watch } from 'vue';
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

  const cachedDispatchers = {}

  watch(() => [route.meta.screenRequirements, mfes], () => {
    const reqs = route.meta.screenRequirements;
    if (!(reqs instanceof Array && reqs.length)) {
      requirements.value = {}
      return;
    }

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
          all[item.key] = cachedDispatchers[cachedKey];
        } else if (api) {
          const cachedKey = `crud:${item.fromCrud.name}:all`;
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(() => api.getAll(), [])
          }
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
            url: item.fromHTTP.uri
          }).then(getCallData), null)
        }
      } else if (item.fromBlueprint) {
        const entitiesOfBlueprint = Sdk.blueprints.entitiesOf(item.fromBlueprint.name)
        if (item.fromBlueprint.identifier) {
          const cachedKey = `blueprint:${item.fromBlueprint.name}:single:${item.fromBlueprint.identifier}`;
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(() => entitiesOfBlueprint.getEntity(item.fromBlueprint.identifier), null)
          }
          all[item.key] = cachedDispatchers[cachedKey];
        } else {
          const cachedKey = `blueprint:${item.fromBlueprint.name}:all`;
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(() => entitiesOfBlueprint.getList(), [])
          }
          all[item.key] = cachedDispatchers[cachedKey];
        }
      }

      return all
    }, {})
  }, { immediate: true })

  return {
    requirements
  }
})