import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { useNotifications } from '@/modules/core/compositions/notifications';

export function useDynamicRouteItem(api, item) {
  const route = useRoute()
  const { error } = useNotifications()

  watch([() => route.name, () => route.params.id], () => {
    if (!route.params.id) {
      item.value = {};
      return;
    }
    api.value.getOne(route.params.id as string)
      .then(data => item.value = data)
      .catch(() => error('Failed to load page data'))
  }, { immediate: true });
}