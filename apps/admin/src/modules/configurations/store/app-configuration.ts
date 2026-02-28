import { reactive, computed } from 'vue'
import configurationsService from '../../../services/apis/configurations-service';
import { IAppConfiguration } from '@qelos/sdk/configurations';

export const appConfigurationStore = reactive<{
  loaded: boolean,
  data: IAppConfiguration & any,
  promise: Promise<any> | null
}>({
  loaded: false,
  data: null,
  promise: null
})

const appConfig = computed<IAppConfiguration>(() => appConfigurationStore.data?.metadata && appConfigurationStore.data.metadata || {});

function updateMetaTags() {
  const { name, slogan, language, direction } = appConfigurationStore.data.metadata;
  const html = document.querySelector('html');
  html.dir = direction;
  html.lang = language;

  let title = document.querySelector('title');
  if (!title) {
    title = document.createElement('title');
    document.head.appendChild(title);
  }
  title.innerHTML = `${name} - ${slogan}`;
  appConfigurationStore.loaded = true;
}

function callAppConfiguration() {
  appConfigurationStore.promise = configurationsService
    .getOne('app-configuration')
    .then(config => appConfigurationStore.data = config)
    .then(updateMetaTags)
    .catch(() => ({}))
}

export function fetchAppConfiguration() {
  if (appConfigurationStore.loaded || appConfigurationStore.promise) {
    return
  }
  callAppConfiguration()
}

export function useAppConfiguration() {
  fetchAppConfiguration()
  return {
    loaded: computed(() => appConfigurationStore.loaded),
    promise: appConfigurationStore.promise,
    appConfig,
  }
}

export function resetConfiguration() {
  appConfigurationStore.loaded = false;
  appConfigurationStore.promise = null;
  fetchAppConfiguration();
}


export function softResetConfiguration() {
  callAppConfiguration();
}