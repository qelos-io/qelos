<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import type { IPlugin } from '@/services/types/plugin';

defineProps<{ plugin: Partial<IPlugin>; refreshing?: boolean }>();
defineEmits<{ (e: 'refresh'): void }>();
</script>

<template>
  <section aria-labelledby="conn-title" class="conn">
    <h2 id="conn-title">{{ $t('Connect to an external service') }}</h2>
    <p class="lead" dir="auto">
      {{ $t('If your plugin runs elsewhere, point to its manifest. Qelos reads its pages, endpoints and events from there, and you can reload them any time.') }}
    </p>
    <el-form label-position="top" class="form" @submit.prevent="$emit('refresh')">
      <FormInput v-model="plugin.manifestUrl" :title="$t('Manifest URL')" type="url" dir="ltr" placeholder="https://your-app.com/manifest.json" />
      <div>
        <el-button type="primary" :icon="Refresh" :loading="refreshing" :disabled="!plugin.manifestUrl" @click="$emit('refresh')">{{ $t('Load from manifest') }}</el-button>
        <p class="note">{{ $t('Loading replaces the settings the manifest defines, then saves the plugin.') }}</p>
      </div>
    </el-form>
  </section>
</template>

<style scoped lang="scss">
.conn h2 {
  margin: 0;
  padding: 0;
  font-size: 1.15rem;
}

.lead,
.note {
  margin: 4px 0 0;
  padding: 0;
  max-inline-size: 60ch;
  color: var(--el-text-color-secondary);
  text-align: start;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-inline-size: 560px;
  margin-block-start: 16px;
}

.note {
  font-size: 0.85rem;
}
</style>
