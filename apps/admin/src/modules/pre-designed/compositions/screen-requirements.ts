import { computed, ref, toRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import { defineStore } from 'pinia';
import { IBlueprint, IScreenRequirement } from '@qelos/global-types'
import { api, getCallData } from '@/services/apis/api';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import Sdk from '@/services/sdk';
import { useAuth } from '@/modules/core/compositions/authentication';
import { isLoadingDataAsUser } from '@/modules/core/store/auth';

export const useScreenRequirementsStore = defineStore('screen-requirements', function useScreenRequirements() {
  const route = useRoute()
  const mfes = usePluginsMicroFrontends();
  const cruds = toRef(mfes, 'cruds');
  const requirements = ref()
  const unWatchers = [];
  const { user } = useAuth();

  function getBlueprintCacheKey(name: string, identifier?: string) {
    return identifier ? `blueprint:${name}:single:${identifier}` : `blueprint:${name}:all`
  }

  const cachedDispatchers = {}

  let currentDispatchers = {}

  function getIdentifierFromAppState(identifier: string) {
    return (identifier.toString?.() || '').replace(/{{(.*?)}}/g, (_, key) => {
      if (!route) {
        return '';
      }
      const [firstPart, secondPart] = key.split('.');
      if (secondPart) {
        if (firstPart === 'user') {
          return user.value[secondPart] || '';
        } else if (firstPart === 'workspace') {
          return user.value?.workspace?.[secondPart] || '';
        }
        return route[firstPart]?.[secondPart] || '';
      }
      return (route.params?.[key] || route.query?.[key]) || '';
    })
  }

  function getQueryParamsFromAppState(query: Record<string, string> = {}) {
    return Object.entries(query).reduce((map, [key, value]) => {
      map[key] = getIdentifierFromAppState(value);
      return map;
    }, {})
  }

  const reloadRequirements = () => {
    const reqs = route.meta.screenRequirements;
    const watchers = [];
    if (!(reqs instanceof Array && reqs.length)) {
      requirements.value = {}
      return;
    }
    currentDispatchers = {};
    unWatchers.forEach(w => w());
    unWatchers.length = 0;
    requirements.value = reqs.reduce((all, item: IScreenRequirement) => {
      if (item.fromCrud) {
        const api = cruds.value[item.fromCrud.name]?.api;
        if (api && item.fromCrud.identifier) {
          const identifier = getIdentifierFromAppState(item.fromCrud.identifier);
          const cachedKey = `crud:${item.fromCrud.name}:single:${identifier}`;
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(() => api.getOne(identifier), null, !!item.lazy)
          }
          currentDispatchers[cachedKey] = cachedDispatchers[cachedKey];
          all[item.key] = cachedDispatchers[cachedKey];
        } else if (api) {
          const cachedKey = `crud:${item.fromCrud.name}:all`;
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(() => api.getAll(), [], !!item.lazy)
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
            url: getIdentifierFromAppState(item.fromHTTP.uri),
            params: getQueryParamsFromAppState(item.fromHTTP.query)
          }).then(getCallData), null, !!item.lazy)
        }
        currentDispatchers[cachedKey] = cachedDispatchers[cachedKey];
        all[item.key] = cachedDispatchers[cachedKey];
      } else if (item.fromBlueprint) {
        const entitiesOfBlueprint = Sdk.blueprints.entitiesOf(item.fromBlueprint.name)
        if (item.fromBlueprint.identifier) {
          const identifier = getIdentifierFromAppState(item.fromBlueprint.identifier);
          const cachedKey = getBlueprintCacheKey(item.fromBlueprint.name, identifier);
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(() => entitiesOfBlueprint.getEntity(identifier, { query: getQueryParamsFromAppState(item.fromBlueprint.query) }), null, !!item.lazy)
          }
          currentDispatchers[cachedKey] = cachedDispatchers[cachedKey];
          all[item.key] = cachedDispatchers[cachedKey];
        } else if (item.fromBlueprint.dependsOn) {
          const cachedKey = getBlueprintCacheKey(item.fromBlueprint.name);
          if (!cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey] = useDispatcher(async ({ query, dependsOn, dependsField }) => {
              const value = all[dependsOn]?.result?.value;
              if (!value) {
                return;
              }
              const values = value instanceof Array ? value : [value];
              const uniqueIdentifiers: string[] = Array.from(
                new Set(values
                  .map(v => v?.identifier ||
                    Object.values(v || {}).flat().map((row: IBlueprint | undefined) => row?.identifier))
                  .filter(Boolean)
                )
              );

              const everyData = await Promise.all(uniqueIdentifiers.map(async identifier => {
                return {
                  identifier,
                  data: await entitiesOfBlueprint.getList({ ...query, [dependsField]: identifier })
                }
              }))
              return everyData.reduce((map, item) => {
                map[item.identifier] = item.data;
                return map;
              }, {})
            }, {}, true, item.fromBlueprint)
          }
          watchers.push({ key: item.fromBlueprint.dependsOn, callback: cachedDispatchers[cachedKey].retry })
          all[item.key] = cachedDispatchers[cachedKey];
        } else {
          const cachedKey = getBlueprintCacheKey(item.fromBlueprint.name);
          if (cachedDispatchers[cachedKey]) {
            cachedDispatchers[cachedKey].metadata.value = item.fromBlueprint;
            cachedDispatchers[cachedKey].retry();
          } else {
            cachedDispatchers[cachedKey] = useDispatcher(({ query }) => entitiesOfBlueprint.getList(getQueryParamsFromAppState(query)), [], !!item.lazy, item.fromBlueprint)
          }
          currentDispatchers[cachedKey] = cachedDispatchers[cachedKey];
          all[item.key] = cachedDispatchers[cachedKey];
        }
      } else if (item.fromData) {
        all[item.key] = ref(item.fromData);
      }

      return all
    }, {})

    watchers.forEach(({ key, callback }) => {
      unWatchers.push(watch(() => requirements.value[key]?.result, callback))
    });
  }

  watch(() => [route.meta.screenRequirements, mfes.navBar, mfes.modals, mfes.cruds, isLoadingDataAsUser.value], reloadRequirements, { immediate: true })

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