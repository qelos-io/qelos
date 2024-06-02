import { computed, reactive } from 'vue'
import router from '../../../router'
import { api } from '@/services/api'
import { IAuthStore } from './types/auth-store'
import { IUser } from './types/user'

export const authStore = reactive<IAuthStore>({
  user: null,
  isLoaded: false,
  userPromise: null
})

export const isAdmin = computed(() => !!(authStore.user && authStore.user.roles.includes('admin')));
export const isPrivilegedUser = computed(() => isAdmin.value || authStore.user.roles.includes('editor'));

function loadUser() {
  authStore.userPromise = api.get<IUser>('/api/me').then(res => res.data)
  return authStore.userPromise
}

export const logout = () => {
  authStore.user = null
  authStore.isLoaded = false
  authStore.userPromise = null
  api.post('/api/logout')
  router.push({ name: 'login' })
}
export const updateProfile = async (changes: Partial<IUser>) => {
  authStore.user = await api.post<IUser>('/api/me', changes).then(res => res.data)
}
export const fetchAuthUser = async (force: boolean = false) => {
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
    authStore.user = user
    return user
  } else {
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
