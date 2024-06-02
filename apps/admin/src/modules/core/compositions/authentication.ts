import { computed, reactive } from 'vue'
import { authStore, fetchAuthUser, login, logout } from '../store/auth'

export function useAuthenticatedIntercept() {
  const isLoaded = computed(() => authStore.isLoaded)

  fetchAuthUser()

  return {
    isLoaded
  }
}

export function useLogin() {
  const form = reactive({ username: '', password: '' })
  return {
    form,
    login: () => {
      return login({ username: form.username, password: form.password })
    },
    isLoggedIn: computed(() => !!authStore.user)
  }
}

export function useAuth() {
  return {
    logout,
    user: computed(() => authStore.user)
  }
}
