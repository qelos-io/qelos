<template>
  <div class="tab-content">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon><font-awesome-icon :icon="['fas', 'database']" /></el-icon>
          <span>{{ $t('CRUD Operations') }}</span>
        </div>
      </template>
      <p class="card-description">{{ $t('Coming soon - Configure CRUD operations for this plugin.') }}</p>
      <div class="coming-soon-placeholder">
        <el-icon class="coming-soon-icon"><font-awesome-icon :icon="['fas', 'clock']" /></el-icon>
        <span>{{ $t('Feature coming soon') }}</span>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { IPlugin } from '@/services/types/plugin';

defineProps<{
  plugin: Partial<IPlugin>;
}>();
</script>

<style scoped>
.tab-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 1rem;
}

.settings-card {
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
}

.card-description {
  margin-bottom: 1.5rem;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.coming-soon-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  color: var(--el-text-color-secondary);
}

.coming-soon-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--el-color-info);
}
</style>
