import { defineStore } from 'pinia';
import { ref } from 'vue';

export const usePluginsStore = defineStore('plugins', () => {
	
  const componentUpdates = ref(0);
  const injectablesLoaded = ref(false);

  function incrementComponentUpdates() {
    componentUpdates.value++;
  }
  
  return { componentUpdates, injectablesLoaded, incrementComponentUpdates  };
});