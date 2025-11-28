import { computed, reactive, ref, watch } from 'vue'
import { api } from '@/services/apis/api'
import { IAuthStore } from './types/auth-store'
import { IUser } from './types/user'

const runIdle = typeof window["requestIdleCallback"] === "function" ? requestIdleCallback : setTimeout;
const ADMIN_DATA_SCOPE_KEY = 'adminLoadingDataAsUser';

export const authStore = reactive<IAuthStore>({
  user: null,
  isLoaded: false,
  userPromise: null
})

export const isAdmin = computed(() => !!(authStore.user && authStore.user.roles.includes('admin')));
export const isPrivilegedUser = computed(() => !!(isAdmin.value || authStore.user?.roles.includes('editor')));
export const isEditingEnabled = ref<boolean>(false);
export const isManagingEnabled = ref<boolean>(false);
export const isLoadingDataAsUser = ref<boolean>(true);

function handleAdminFeatures() {
  if (isAdmin.value) {
    isEditingEnabled.value = localStorage.getItem('adminEditingEnabled') === 'true';
    isManagingEnabled.value = localStorage.getItem('adminManagingEnabled') === 'true';
    const persistedDataScope = localStorage.getItem(ADMIN_DATA_SCOPE_KEY);
    isLoadingDataAsUser.value = persistedDataScope !== 'false';
    watch(isEditingEnabled, (newVal: boolean) => {
      runIdle(() => localStorage.setItem('adminEditingEnabled', newVal.toString()))
    });
    watch(isManagingEnabled, (newVal: boolean) => {
      runIdle(() => localStorage.setItem('adminManagingEnabled', newVal.toString()))
    });
    watch(isLoadingDataAsUser, (newVal: boolean) => {
      runIdle(() => localStorage.setItem(ADMIN_DATA_SCOPE_KEY, newVal.toString()))
    });
  } else {
    isEditingEnabled.value = false;
    isManagingEnabled.value = false;
    isLoadingDataAsUser.value = true;
  }
}
function loadUser() {
  authStore.userPromise = api.get<IUser>('/api/me').then(res => res.data)
  return authStore.userPromise
}

export const logout = async () => {
  authStore.user = null
  authStore.isLoaded = false
  authStore.userPromise = null
  api.post('/api/logout').catch();
}
export const updateProfile = async (changes: Partial<IUser>) => {
  authStore.user = await api.post<IUser>('/api/me', changes).then(res => res.data)
}
export const fetchAuthUser = async (force: boolean = false, optionalUser: boolean = false) => {
  if (!force && (authStore.user || authStore.userPromise)) {
    return authStore.userPromise
  }

  let user;
  try {
    user = await loadUser().catch(() => null);
    if (!user) {
      throw new Error('first attempt to load user failed');
    }
  } catch {
    user = await loadUser().catch(() => null);
  }

  authStore.isLoaded = true
  if (user?.roles?.length) {
    authStore.user = user;
    handleAdminFeatures();
    return user
  } else if (!optionalUser) {
    logout()
  }
}

export const login = async ({ username, password }: { username: string, password: string }) => {
  const { data: { payload } } = await api.post<{ payload: { user: IUser } }>('/api/signin', {
    username,
    password,
  })
  authStore.user = payload.user;
  authStore.isLoaded = true
  authStore.userPromise = loadUser().catch(() => payload.user).then(user => {
    authStore.user = user;
    return user;
  });
}

watch(isManagingEnabled, (newVal: boolean) => {
  if (newVal) {
    document.querySelector('html').setAttribute('managing-enabled', 'true');
  } else {
    document.querySelector('html').removeAttribute('managing-enabled');
  }
})
watch(isEditingEnabled, (newVal: boolean) => {
  if (newVal) {
    document.querySelector('html').setAttribute('editing-enabled', 'true');
  } else {
    document.querySelector('html').removeAttribute('editing-enabled');
  }
})