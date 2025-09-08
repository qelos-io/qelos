import { defineStore } from 'pinia';
import { ref } from 'vue';
import kebabCase from 'lodash.kebabcase';

export const usePluginsStore = defineStore('plugins', () => {
	
  const componentUpdates = ref(0);
  const injectablesLoaded = ref(false);

  const loadedCustomComponents = ref<string[]>([]);

  function incrementComponentUpdates(componentName: string) {
    componentUpdates.value++;
    loadedCustomComponents.value.push(kebabCase(componentName));
  }
  
  return { componentUpdates, injectablesLoaded, incrementComponentUpdates, loadedCustomComponents };
});