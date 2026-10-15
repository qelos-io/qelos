import { computed } from 'vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import { useRoute } from 'vue-router';
import { isEditingEnabled } from '@/modules/core/store/auth';
import { usePluginsStore } from '@/modules/plugins/store/pluginsStore';
import { useStaticComponentsStore } from '@/modules/no-code/store/static-components';
import { annotateStructure } from '@/modules/pre-designed/services/structure-ops';
import { previewState } from './page-editing';

export function useSingleItemCrud() {
  const mfes = usePluginsMicroFrontends();
  const pluginsStore = usePluginsStore();
  const staticComponentsStore = useStaticComponentsStore();
  const route = useRoute()

  /** components added by the app (not part of the built-in set) are blocks too */
  const extraEditableTags = computed(() => [
    ...pluginsStore.loadedCustomComponents,
    ...staticComponentsStore.staticComponents.map((c) => c.name),
  ]);

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
  const api = computed(() => mfes.cruds[crud.value?.name]?.api);
  /** what is saved */
  const savedStructure = computed(() => (route.meta.mfe as any)?.structure || '<div></div>');
  /** what the page shows: a draft while one is being designed */
  const givenStructure = computed(() => previewState.structure ?? savedStructure.value);

  function getTemplate(html: string = givenStructure.value) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template;
  }

  const relevantStructure = computed(() => {
    const template = getTemplate(givenStructure.value);
    if (isEditingEnabled.value) {
      annotateStructure(template, extraEditableTags.value);
    }
    return template.innerHTML;
  });

  const styles = computed(() => {
    if (givenStructure.value.includes('<style>')) {
      return Array.from(getTemplate(givenStructure.value).content.querySelectorAll('style'))
        .map((style) => style.innerHTML)
        .join('\n');
    }
  })

  return {
    crud,
    api,
    relevantStructure,
    givenStructure,
    savedStructure,
    extraEditableTags,
    styles
  }
}