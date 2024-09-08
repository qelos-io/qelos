import { computed } from 'vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { useRoute } from 'vue-router';

export function useSingleItemCrud() {
  const mfes = usePluginsMicroFrontends();
  const route = useRoute()

  const crud = computed(() => {
    const crud = route.meta.crud as any || { display: {} };
    return {
      ...crud,
      display: {
        name: 'item',
        capitalizedPlural: 'Items',
        ...(crud.display || {}),
      },
      screen: {
        structure: (route.meta.mfe as any)?.structure
      }
    }
  });
  const api = computed(() => mfes.cruds[crud.value.name].api);
  const relevantStructure = computed(() => {
    return (route.meta.mfe as any)?.structure || '<div></div>';
  });

  const styles = computed(() => {
    if (relevantStructure.value.includes('<style>')) {
      // get all style elements
      const styleElements = relevantStructure.value.replace(/\n/g, '').match(/<style>(.*?)<\/style>/g);
      //strip style tags
      return styleElements.map((styleElement) => styleElement.replace(/<style>/g, '').replace(/<\/style>/g, ''));
    }
  })

  return {
    crud,
    api,
    relevantStructure,
    styles
  }
}