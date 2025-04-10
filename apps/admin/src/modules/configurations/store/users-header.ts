import { reactive, computed } from 'vue'
import configurationsService from '../../../services/configurations-service';

export const usersHeaderStore = reactive<{
  loaded: boolean,
  data: { html: string, active: boolean } | null,
  promise: Promise<any> | null
}>({
  loaded: false,    
  data: null,
  promise: null
})

const usersHeader = computed<{ html: string, active: boolean }>(() => usersHeaderStore.data);

function callUsersHeader() {
  usersHeaderStore.promise = configurationsService
    .getOne('users-header')
    .then(config => usersHeaderStore.data = config?.metadata)
    .catch(() => ({}))
    .finally(() => usersHeaderStore.loaded = true);
}

export function fetchUsersHeader() {
  if (usersHeaderStore.loaded || usersHeaderStore.promise) {
    return
  }
  callUsersHeader()
}

export function useUsersHeader() {
  fetchUsersHeader()
  return {
    loaded: computed(() => usersHeaderStore.loaded),
    promise: usersHeaderStore.promise,
    usersHeader,
  }
}

export function resetUsersHeader() {
  usersHeaderStore.loaded = false;
  usersHeaderStore.promise = null;
  fetchUsersHeader();
}


export function softResetUsersHeader() {
  callUsersHeader();
}