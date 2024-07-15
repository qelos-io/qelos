import { ref } from 'vue'

export function useDispatcher<T = any>(callback, defaultValue: T | null = null, lazy = false) {
  const result = ref<T>(defaultValue)
  const loading = ref<boolean>(true)
  const error = ref<any>(null)
  const loaded = ref(false);

  const caller = async () => {
    try {
      result.value = await callback()
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
      loaded.value = true;
    }
  }

  if (!lazy) {
    caller()
  }

  return {
    result,
    loading,
    loaded,
    error,
    retry: caller
  }
}
