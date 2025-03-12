<template>
  <div>
    <AssetsStorageSelector v-if="isPrivilegedUser" @change="selectedStorage = $event._id" />
    <BasicFileUploader
      v-if="selectedStorage || !isPrivilegedUser"
      :storage="selectedStorage"
      @upload="uploadComplete"
    />
  </div>
</template>
<script lang="ts">
  import { ref } from 'vue'
  import AssetsStorageSelector from './AssetsStorageSelector.vue'
  import BasicFileUploader from './BasicFileUploader.vue'
  import { isPrivilegedUser } from '@/modules/core/store/auth';

  export default {
    name: 'AssetUploader',
    components: { BasicFileUploader, AssetsStorageSelector },
    setup(_, { emit }) {
      const selectedStorage = ref(null)

      return {
        selectedStorage,
        isPrivilegedUser,
        uploadComplete({ publicUrl }) {
          emit('change', publicUrl)
        }
      }
    }
  }
</script>
