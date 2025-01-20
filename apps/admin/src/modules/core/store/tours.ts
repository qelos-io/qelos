import { defineStore } from 'pinia';
import { ref } from 'vue';
import sdk from '@/services/sdk';
import { authStore } from '@/modules/core/store/auth';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';

export const useToursStore = defineStore('tours', () => {
  const tourOpen = ref(false);
  const currentTour = ref(null);
  const currentVersion = ref(1);

  function getTourKey() {
    return `seenTour::${currentTour.value}`;
  }

  const { result: fullUser, promise, retry } = useDispatcher(() => sdk.users.getUser(authStore.user._id));
  async function tourFinished() {
    await sdk.users.update(authStore.user._id, {
      internalMetadata: {
        [getTourKey()]: currentVersion.value
      }
    })
    await retry();
  }

  return {
    setCurrentTour: async (key: string, version: number) => {
      currentTour.value = key;
      currentVersion.value = version;
      await promise.value;
      if ((fullUser.value.internalMetadata?.[getTourKey()] || 0) < currentVersion.value) {
        tourOpen.value = true;
      }
    },
    tourFinished,
    tourOpen,
    currentTour,
  }
})