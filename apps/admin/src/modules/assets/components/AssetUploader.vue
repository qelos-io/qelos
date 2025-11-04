<template>
  <div>
    <AssetsStorageSelector v-if="isPrivilegedUser" v-model="selectedStorage"/>
    <div v-if="value && !showUploader" class="assets-view flex-row">
      <el-card class="asset-view" shadow="hover" @click="showUploader = true">
        <img :src="value" v-if="isImage" alt=""/>
        <h3 v-else><font-awesome-icon :icon="['far', 'file-lines']" /></h3>
        <template #footer>
          <RemoveButton @click.stop="$emit('change', null)" />
        </template>
      </el-card>
    </div>
    <BasicFileUploader
        v-else-if="selectedStorage || !isPrivilegedUser"
        :storage="selectedStorage"
        v-bind="uploadConfig"
        @upload="uploadComplete"
    />
  </div>
</template>
<script lang="ts">
import { computed, ref } from 'vue'
import AssetsStorageSelector from './AssetsStorageSelector.vue'
import BasicFileUploader from './BasicFileUploader.vue'
import { isPrivilegedUser } from '@/modules/core/store/auth';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';

export default {
  name: 'AssetUploader',
  components: { RemoveButton, BasicFileUploader, AssetsStorageSelector },
  props: {
    value: {
      default: null
    },
    uploadConfig: {
      type: Object,
      default: () => ({
        header: '',
        subheader: '',
        iconUrl: '',
        mainText: '',
        secondaryText: ''
      })
    }
  },
  setup(props, { emit }) {
    const selectedStorage = ref(null)

    const isImage = computed(() => ['jpg', 'jpeg', 'png', 'gif'].includes(props.value?.split?.('.').pop().toLowerCase()))
    const showUploader = ref(!props.value);

    return {
      selectedStorage,
      isPrivilegedUser,
      showUploader,
      isImage,
      uploadComplete({ publicUrl }) {
        emit('change', publicUrl)
      }
    }
  }
}
</script>
<style scoped>
.assets-view {
  padding-block: 10px;
}

.asset-view img {
  max-height: 200px;
  margin: 0;
}
</style>