<script setup lang="ts" generic="T extends { label: string }">
defineProps<{ items: T[]; label?: string }>();
defineEmits<{ (e: 'pick', item: T): void }>();
</script>

<template>
  <div class="chips" role="group" :aria-label="label">
    <span v-if="label" class="label">{{ label }}</span>
    <button v-for="item in items" :key="item.label" type="button" class="chip" @click="$emit('pick', item)">{{ item.label }}</button>
  </div>
</template>

<style scoped lang="scss">
.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.label {
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.chip {
  padding: 3px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chip {
    transition: none;
  }
}
</style>
