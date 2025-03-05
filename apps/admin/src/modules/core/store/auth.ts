import { computed, reactive, ref, watch } from 'vue'
import { api } from '@/services/api'
import { IAuthStore } from './types/auth-store'
import { IUser } from './types/user'

export const authStore = reactive<IAuthStore>({
  user: null,
  isLoaded: false,
  userPromise: null
})

export const isAdmin = computed(() => !!(authStore.user && authStore.user.roles.includes('admin')));
export const isPrivilegedUser = computed(() => !!(isAdmin.value || authStore.user?.roles.includes('editor')));
export const isEditingEnabled = ref<boolean>(localStorage.adminEditingEnabled === 'true');

function handleAdminFeatures() {
  if (isAdmin.value) {
    watch(isEditingEnabled, (newVal: boolean) => {
      (requestIdleCallback || setTimeout)(() => localStorage.setItem('adminEditingEnabled', newVal.toString()))
    });
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
