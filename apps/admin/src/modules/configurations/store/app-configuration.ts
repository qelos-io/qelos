import { reactive, computed } from 'vue'
import configurationsService from '../../../services/configurations-service';
import {IAppConfiguration} from '@greenpress/sdk/dist/configurations';

export const appConfigurationStore = reactive<{ loaded: false, data: IAppConfiguration & any, promise: Promise<any> | null }>({
  loaded: false,
  data: null,
  promise: null
})

export function useAppConfiguration() {
  fetchAppConfiguration()
  return computed(() => appConfigurationStore.data)
}

export function fetchAppConfiguration() {
  if (appConfigurationStore.loaded || appConfigurationStore.promise) {
    return
  }
  appConfigurationStore.promise = configurationsService
    .getOne('app-configuration')
    .then(config => appConfigurationStore.data = config)
    .catch(() => ({}))
}

export function resetConfiguration() {
  appConfigurationStore.loaded = false;
  appConfigurationStore.promise = null;
  fetchAppConfiguration();
}