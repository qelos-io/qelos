<script setup lang="ts">
import { Document, Connection } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';

const { blueprints } = storeToRefs(useBlueprintsStore());

const contextBlueprints = defineModel<string[]>('contextBlueprints', { required: true });
const includeUserContext = defineModel<boolean>('includeUserContext', { required: true });
const includeWorkspaceContext = defineModel<boolean>('includeWorkspaceContext', { required: true });
</script>

<template>
  <div class="agent-context-step">
    <div class="step-header">
      <el-icon class="step-icon"><Document /></el-icon>
      <div>
        <h3>{{ $t('Context & Data') }}</h3>
        <p class="step-description">{{ $t('Select what contextual data to provide to your AI agent') }}</p>
      </div>
    </div>

    <el-alert type="info" :closable="false" class="mb-4">
      {{ $t('Context data helps your AI agent provide more relevant and personalized responses') }}
    </el-alert>

    <div class="context-options">
      <el-card class="context-card">
        <template #header>
          <div class="card-header">
            <el-icon><Connection /></el-icon>
            <span>{{ $t('User & Workspace Context') }}</span>
          </div>
        </template>
        <el-checkbox v-model="includeUserContext" class="mb-3">
          {{ $t('Include user information') }}
        </el-checkbox>
        <br />
        <el-checkbox v-model="includeWorkspaceContext">
          {{ $t('Include workspace information') }}
        </el-checkbox>
      </el-card>

      <el-card class="context-card">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>{{ $t('Blueprint Data') }}</span>
          </div>
        </template>
        <p class="card-description">{{ $t('Select blueprints to include as context') }}</p>
        <el-select
          v-model="contextBlueprints"
          multiple
          filterable
          collapse-tags-tooltip
          :placeholder="$t('Select blueprints')"
          class="w-full"
        >
          <el-option
            v-for="blueprint in blueprints"
            :key="blueprint.identifier"
            :label="blueprint.name"
            :value="blueprint.identifier"
          />
        </el-select>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.agent-context-step {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mb-3 {
  margin-bottom: 12px;
}

.mb-4 {
  margin-bottom: 16px;
}

.step-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-fill-color-light) 100%);
  border-radius: 8px;
  border-left: 4px solid var(--el-color-primary);
}

.step-icon {
  font-size: 32px;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.step-header h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.step-description {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.context-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.context-card {
  transition: all 0.2s ease;
}

.context-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.card-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.w-full {
  width: 100%;
}

:deep(.el-card__header) {
  padding: 12px 16px;
  background-color: var(--el-fill-color-light);
}

:deep(.el-card__body) {
  padding: 16px;
}

@media (max-width: 768px) {
  .context-options {
    grid-template-columns: 1fr;
  }
}
</style>
