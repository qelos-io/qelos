<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { ArrowLeft } from '@element-plus/icons-vue';

defineProps<{
  title: string;
  subtitle?: string;
  /** a link back to the parent list, shown above the title */
  back?: { label: string; to: RouteLocationRaw };
}>();
</script>

<template>
  <header class="app-page-head">
    <router-link v-if="back" class="back" :to="back.to">
      <el-icon class="dir-icon" aria-hidden="true"><ArrowLeft /></el-icon>
      <span>{{ back.label }}</span>
    </router-link>
    <div class="row">
      <div class="titles">
        <div class="title-line">
          <slot name="lead" />
          <h1 dir="auto">{{ title }}</h1>
          <slot name="aside" />
        </div>
        <p v-if="subtitle || $slots.subtitle" class="subtitle" dir="auto">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
      <div v-if="$slots.actions" class="actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-page-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-inline-start: -2px;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  text-decoration: none;
}

.back:hover {
  color: var(--el-color-primary);
}

.back:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.titles {
  min-inline-size: 0;
}

.title-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
}

h1 {
  margin: 0;
  padding: 0;
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.25;
  text-align: start;
  color: var(--el-text-color-primary);
}

.subtitle {
  margin: 4px 0 0;
  padding: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  text-align: start;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

.actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
}

@media (max-width: 639px) {
  .row {
    align-items: flex-start;
  }

  .actions :deep(.action-label) {
    display: none;
  }
}
</style>
