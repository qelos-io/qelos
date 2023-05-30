import {reactive, computed} from 'vue'
import configurationsService from '../../../services/configurations-service';
import {IAppConfiguration} from '@qelos/sdk/dist/configurations';

export const appConfigurationStore = reactive<{ loaded: boolean, data: IAppConfiguration & any, promise: Promise<any> | null }>({
  loaded: false,
  data: null,
  promise: null
})

const appConfig = computed(() => appConfigurationStore.data?.metadata && appConfigurationStore.data.metadata || {});

function updateMetaTags() {
  const {name, slogan, language, direction} = appConfigurationStore.data.metadata;
  const html = document.querySelector('html');
  html.dir = direction;
  html.lang = language;

  document.querySelector('title').innerHTML = `${name} - ${slogan}`;
  appConfigurationStore.loaded = true;
}

export function useAppConfiguration() {
  fetchAppConfiguration()
  return {
    loaded: computed(() => appConfigurationStore.loaded),
    appConfig,
  }
}

export function fetchAppConfiguration() {
  if (appConfigurationStore.loaded || appConfigurationStore.promise) {
    return
  }
  appConfigurationStore.promise = configurationsService
    .getOne('app-configuration')
    .then(config => appConfigurationStore.data = config)
    .then(updateMetaTags)
    .catch(() => ({}))
}

export function resetConfiguration() {
  appConfigurationStore.loaded = false;
  appConfigurationStore.promise = null;
  fetchAppConfiguration();
}