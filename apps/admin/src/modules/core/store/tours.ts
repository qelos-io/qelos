import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUserMetadataStore } from '@/modules/core/store/user-metadata';

export const useToursStore = defineStore('tours', () => {
  const tourOpen = ref(false);
  const currentTour = ref(null);
  const currentVersion = ref(1);
  const userMetadataStore = useUserMetadataStore();

  function getTourKey() {
    return `seenTour::${currentTour.value}`;
  }

  async function tourFinished() {
    await userMetadataStore.updateTourStatus(getTourKey(), currentVersion.value);
  }

  return {
    setCurrentTour: async (key: string, version: number) => {
      currentTour.value = key;
      currentVersion.value = version;
      await userMetadataStore.promise;
      
      if (!userMetadataStore.fullUser) {
        return;
      }
      
      if (!userMetadataStore.hasTourBeenSeen(getTourKey(), currentVersion.value)) {
        tourOpen.value = true;
      }
    },
    tourFinished,
    tourOpen,
    currentTour,
  }
})