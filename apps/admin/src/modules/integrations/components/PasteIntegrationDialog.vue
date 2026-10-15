<script lang="ts" setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const visible = defineModel<boolean>('visible', { required: true });
const emit = defineEmits<{ apply: [integration: Record<string, any>] }>();
const { t } = useI18n();

const text = ref('');
const error = ref('');

watch(visible, (open) => {
  if (open) {
    text.value = '';
    error.value = '';
  }
});

function apply() {
  try {
    const parsed = JSON.parse(text.value);
    if (!parsed?.trigger || !parsed?.target) {
      error.value = t('Invalid integration object. Must contain trigger and target properties.');
      return;
    }
    error.value = '';
    emit('apply', parsed);
    visible.value = false;
  } catch {
    error.value = t('Invalid JSON format. Please check your input.');
  }
}
</script>

<template>
  <el-dialog v-model="visible" :title="$t('Paste Integration Object')" width="min(560px, 94vw)" append-to-body>
    <p class="intro">{{ $t('Paste a valid integration JSON object below:') }}</p>
    <el-input v-model="text" type="textarea" :rows="10" dir="ltr" spellcheck="false" :aria-label="$t('Integration JSON')" :placeholder="$t('Paste JSON here...')" />
    <el-alert v-if="error" class="error" type="error" show-icon :closable="false" :title="error" role="alert" />
    <template #footer>
      <el-button @click="visible = false">{{ $t('Cancel') }}</el-button>
      <el-button type="primary" :disabled="!text.trim()" @click="apply">{{ $t('Apply') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.intro {
  margin: 0 0 8px;
  color: var(--el-text-color-secondary);
  text-align: start;
}

.error {
  margin-block-start: 10px;
}
</style>
