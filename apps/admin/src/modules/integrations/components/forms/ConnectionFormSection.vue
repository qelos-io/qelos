<script setup lang="ts">
import { useId } from 'vue';

withDefaults(
  defineProps<{
    title: string;
    description?: string;
  }>(),
  { description: '' },
);

const titleId = useId();
</script>

<template>
  <section
    class="connection-form-section"
    :aria-labelledby="titleId"
  >
    <div class="connection-form-section__head">
      <h3 :id="titleId" class="connection-form-section__title">{{ title }}</h3>
      <p v-if="description" class="connection-form-section__desc">{{ description }}</p>
    </div>
    <div class="connection-form-section__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.connection-form-section {
  margin-block-end: 20px;
}

.connection-form-section:last-child {
  margin-block-end: 0;
}

.connection-form-section__head {
  margin-block-end: 12px;
  padding-block-end: 8px;
  border-block-end: 1px solid var(--el-border-color-lighter);
}

.connection-form-section__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--el-text-color-primary);
}

.connection-form-section__desc {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--el-text-color-secondary);
}

.connection-form-section__body {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.connection-form-section__body :deep(.form-input-container) {
  margin-block-end: 4px;
}

.connection-form-section__body :deep(.el-form-item) {
  margin-block-end: 16px;
}

.connection-form-section__body :deep(.el-form-item:last-child) {
  margin-block-end: 0;
}
</style>
