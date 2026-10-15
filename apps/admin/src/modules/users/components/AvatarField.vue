<script setup lang="ts">
import { ref } from 'vue';
import UserAvatar from './UserAvatar.vue';
import AssetUploader from '@/modules/assets/components/AssetUploader.vue';

defineProps<{ name: string }>();
const image = defineModel<string>({ default: '' });
const open = ref(false);
const url = ref('');

function useUrl() {
  image.value = url.value.trim();
  url.value = '';
  open.value = false;
}

function uploaded(value: string | null) {
  image.value = value || '';
  if (value) open.value = false;
}
</script>

<template>
  <div class="field">
    <UserAvatar :name="name" :src="image" :size="72" />
    <div class="actions">
      <el-button @click="open = true">{{ image ? $t('Change photo') : $t('Add a photo') }}</el-button>
      <el-button v-if="image" text type="danger" @click="image = ''">{{ $t('Remove photo') }}</el-button>
    </div>

    <el-dialog v-model="open" :title="$t('Profile photo')" width="460px" append-to-body align-center>
      <el-form label-position="top" @submit.prevent="useUrl">
        <el-form-item :label="$t('Upload an image')">
          <AssetUploader :value="null" :upload-config="{ isImage: true }" @change="uploaded" />
        </el-form-item>
        <el-form-item :label="$t('Or paste an image address')">
          <el-input v-model="url" dir="ltr" type="url" placeholder="https://…" @keydown.enter.prevent="useUrl" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="open = false">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" :disabled="!url.trim()" @click="useUrl">{{ $t('Use this address') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
