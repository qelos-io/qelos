<script setup lang="ts">
import { computed } from 'vue';
import { ElBadge } from 'element-plus';

interface Props {
  title: string;
  subtitle?: string;
  count?: number;
  showCount?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showCount: true
});

const hasCount = computed(() => props.showCount && typeof props.count === 'number');
const hasSubtitle = computed(() => !!props.subtitle);
</script>

<template>
  <header class="section-header">
    <div class="section-header__content">
      <h2 class="section-header__title">{{ title }}</h2>
      <p v-if="hasSubtitle" class="section-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="hasCount" class="section-header__count">
      <el-badge :value="count" type="primary" />
    </div>
  </header>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--el-border-color-light);
}

.section-header__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-header__title {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
  line-height: 1.4;
}

.section-header__subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0;
  line-height: 1.4;
}

.section-header__count {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .section-header__count {
    align-self: flex-end;
  }
}
</style>
