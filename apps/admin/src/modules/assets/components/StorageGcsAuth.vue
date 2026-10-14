<template>
  <div class="gcs-auth">
    <label class="gcs-drop" :class="{ filled: !!fileName, invalid: !!error }">
      <input type="file" accept="application/json,.json" class="gcs-input" @change="onFile" />
      <span class="gcs-title">{{ fileName || $t('Choose the service-account JSON key') }}</span>
      <span class="gcs-hint">{{ fileName ? $t('Choose another file to replace it') : $t('The key never leaves your server unencrypted') }}</span>
    </label>
    <p v-if="error" class="gcs-error" role="alert">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const model = defineModel<Record<string, any> | null>();
const { t } = useI18n();

const fileName = ref('');
const error = ref('');

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  error.value = '';
  try {
    const credentials = JSON.parse(await file.text());
    if (!credentials || typeof credentials !== 'object' || !credentials.private_key) {
      throw new Error('not a service-account key');
    }
    fileName.value = file.name;
    model.value = credentials;
  } catch {
    fileName.value = '';
    model.value = null;
    error.value = t('This file is not a valid service-account JSON key');
  }
}
</script>

<style scoped lang="scss">
.gcs-drop {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px;
  border: 1px dashed var(--el-border-color-darker);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  cursor: pointer;

  &:hover,
  &:focus-within {
    border-color: var(--el-color-primary);
  }

  &:focus-within {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.filled {
    border-style: solid;
    border-color: var(--el-color-success);
  }

  &.invalid {
    border-color: var(--el-color-danger);
  }
}

.gcs-input {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  opacity: 0;
}

.gcs-title {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.gcs-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.gcs-error {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--el-color-danger);
}
</style>
