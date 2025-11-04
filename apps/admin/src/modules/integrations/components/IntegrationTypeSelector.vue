<script setup lang="ts">
import { computed } from 'vue';
import { IntegrationType, getIntegrationTypeLabel, getIntegrationTypeDescription } from '@/modules/integrations/utils/integration-type-detector';

const props = defineProps<{
  modelValue: IntegrationType;
  detectedType: IntegrationType;
  disabled?: boolean;
}>();

const selectedType = defineModel<IntegrationType>('modelValue');

const availableTypes = computed(() => [
  {
    value: IntegrationType.AIAgent,
    label: getIntegrationTypeLabel(IntegrationType.AIAgent),
    description: getIntegrationTypeDescription(IntegrationType.AIAgent),
    icon: 'ChatDotRound',
    recommended: props.detectedType === IntegrationType.AIAgent
  },
  {
    value: IntegrationType.Standard,
    label: getIntegrationTypeLabel(IntegrationType.Standard),
    description: getIntegrationTypeDescription(IntegrationType.Standard),
    icon: 'Connection',
    recommended: props.detectedType === IntegrationType.Standard
  }
]);

const showSelector = computed(() => {
  // Show selector if detected type is AI Agent (user might want to switch to standard)
  return props.detectedType === IntegrationType.AIAgent;
});
</script>

<template>
  <div v-if="showSelector" class="integration-type-selector">
    <div class="selector-header">
      <el-icon class="header-icon"><MagicStick /></el-icon>
      <span class="header-text">{{ $t('Integration Type') }}</span>
    </div>
    
    <el-radio-group v-model="selectedType" class="type-options" :disabled="disabled">
      <el-radio
        v-for="type in availableTypes"
        :key="type.value"
        :value="type.value"
        class="type-option"
        border
      >
        <div class="option-content">
          <div class="option-header">
            <el-icon class="option-icon">
              <component :is="type.icon" />
            </el-icon>
            <span class="option-label">{{ $t(type.label) }}</span>
            <el-tag v-if="type.recommended" size="small" type="success" effect="plain">
              {{ $t('Recommended') }}
            </el-tag>
          </div>
          <p class="option-description">{{ $t(type.description) }}</p>
        </div>
      </el-radio>
    </el-radio-group>

    <el-alert
      v-if="detectedType === IntegrationType.AIAgent && selectedType === IntegrationType.Standard"
      type="info"
      :closable="false"
      show-icon
      class="mt-3"
    >
      {{ $t('You can switch back to AI Agent mode at any time if your configuration matches the criteria.') }}
    </el-alert>
  </div>
</template>

<style scoped>
.integration-type-selector {
  margin-bottom: 24px;
  padding: 16px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.selector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.header-icon {
  color: var(--el-color-primary);
}

.type-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.type-option {
  width: 100%;
  height: auto;
  padding: 0;
  margin: 0;
}

:deep(.type-option .el-radio__input) {
  align-self: flex-start;
  margin-top: 16px;
}

:deep(.type-option .el-radio__label) {
  width: 100%;
  padding: 12px;
}

.option-content {
  width: 100%;
}

.option-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.option-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.option-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.option-description {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.mt-3 {
  margin-top: 12px;
}

@media (max-width: 768px) {
  .integration-type-selector {
    padding: 12px;
  }
  
  .type-options {
    gap: 8px;
  }
}
</style>
