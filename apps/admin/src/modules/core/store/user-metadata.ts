import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import sdk from '@/services/sdk';
import { authStore } from '@/modules/core/store/auth';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';

export const useUserMetadataStore = defineStore('userMetadata', () => {
  // Load full user data with internal metadata
  const { result: fullUser, promise, retry } = useDispatcher(() => 
    authStore.user ? sdk.users.getUser(authStore.user._id) : Promise.resolve(null)
  );

  // Computed properties for specific metadata
  const selectedDashboardBlueprints = computed(() => 
    fullUser.value?.internalMetadata?.selectedDashboardBlueprints || []
  );

  const internalMetadata = computed(() => 
    fullUser.value?.internalMetadata || {}
  );

  // Update internal metadata
  async function updateInternalMetadata(updates: Record<string, any>) {
    if (!authStore.user) return;

    const currentMetadata = fullUser.value?.internalMetadata || {};
    
    await sdk.users.update(authStore.user._id, {
      internalMetadata: {
        ...currentMetadata,
        ...updates
      }
    });
    
    await retry();
  }

  // Specific method for updating selected dashboard blueprints
  async function updateSelectedDashboardBlueprints(blueprints: string[]) {
    await updateInternalMetadata({
      selectedDashboardBlueprints: blueprints
    });
  }

  // Method for tour functionality (to replace tours store logic)
  async function updateTourStatus(tourKey: string, version: number) {
    await updateInternalMetadata({
      [tourKey]: version
    });
  }

  // Check if tour has been seen
  function hasTourBeenSeen(tourKey: string, version: number): boolean {
    if (!fullUser.value) return false;
    return (fullUser.value.internalMetadata?.[tourKey] || 0) >= version;
  }

  return {
    // Data
    fullUser,
    promise,
    retry,
    
    // Computed
    selectedDashboardBlueprints,
    internalMetadata,
    
    // Methods
    updateInternalMetadata,
    updateSelectedDashboardBlueprints,
    updateTourStatus,
    hasTourBeenSeen
  };
});
