<script lang="ts" setup>
import { useId } from 'vue';

defineProps<{ title: string; description?: string }>();
const id = useId();
</script>

<template>
  <div class="row" role="group" :aria-labelledby="id">
    <div class="text">
      <span :id="id" class="title">{{ title }}</span>
      <span v-if="description" class="description">{{ description }}</span>
      <slot name="note" />
    </div>
    <div class="control"><slot :labelled-by="id" /></div>
  </div>
</template>

<style scoped lang="scss">
.row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-inline-size: 0;
}

.title {
  font-weight: 600;
}

.description {
  color: var(--el-text-color-secondary);
  font-size: 0.86rem;
  text-align: start;
}

.control {
  flex: none;
  padding-block-start: 2px;
}

@media (max-width: 639px) {
  .row {
    gap: 12px;
  }
}
</style>
