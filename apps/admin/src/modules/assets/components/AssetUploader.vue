<template>
  <div>
    <AssetsStorageSelector v-if="isPrivilegedUser" v-model="selectedStorage"/>
    <div v-if="value && !showUploader" class="assets-view flex-row">
      <el-card
        class="asset-view"
        shadow="hover"
        role="button"
        tabindex="0"
        :aria-label="$t('Replace file')"
        @click="showUploader = true"
        @keydown.enter.self="showUploader = true"
        @keydown.space.self.prevent="showUploader = true"
      >
        <img :src="value" v-if="isImage" alt=""/>
        <template v-else>
          <h3><font-awesome-icon :icon="['far', 'file-lines']" /></h3>
          <p class="file-name" dir="ltr">{{ fileName }}</p>
        </template>
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
        secondaryText: '',
        isImage: false,
      })
    }
  },
  setup(props, { emit }) {
    const selectedStorage = ref(null)

    const isImage = computed(() => props.uploadConfig?.isImage || ['jpg', 'jpeg', 'png', 'gif'].includes(props.value?.split?.('.').pop().toLowerCase()))
    const showUploader = ref(!props.value);
    const fileName = computed(() => decodeURIComponent(String(props.value || '').split('?')[0].split('/').pop() || ''))

    return {
      selectedStorage,
      isPrivilegedUser,
      showUploader,
      isImage,
      fileName,
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

.asset-view {
  cursor: pointer;
}

.asset-view:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.file-name {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
}

.asset-view img {
  max-height: 200px;
  margin: 0;
}
</style>