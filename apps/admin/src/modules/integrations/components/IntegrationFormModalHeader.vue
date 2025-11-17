<script setup lang="ts">
import { computed } from 'vue';
import { IIntegration, IIntegrationSource } from '@qelos/global-types';
import { detectIntegrationType, IntegrationType } from '@/modules/integrations/utils/integration-type-detector';

const props = defineProps<{
  active: boolean;
  integrationForm: Pick<IIntegration, 'trigger' | 'target'>;
  sources: IIntegrationSource[];
  viewMode: IntegrationType;
}>();

const emit = defineEmits<{
  'update:active': [value: boolean];
  'update:viewMode': [value: IntegrationType];
  'paste': [];
}>();

// Active toggle
const isActive = computed({
  get: () => props.active,
  set: (value: boolean) => emit('update:active', value)
});

// Integration type detection
const detectedIntegrationType = computed(() => {
  if (!props.sources?.length) return IntegrationType.Standard;
  return detectIntegrationType(props.integrationForm, props.sources);
});

// AI Agent mode toggle
const isAIAgentMode = computed({
  get: () => props.viewMode === IntegrationType.AIAgent,
  set: (value: boolean) => {
    emit('update:viewMode', value ? IntegrationType.AIAgent : IntegrationType.Standard);
  }
});

const openPasteDialog = () => {
  emit('paste');
};
</script>

<template>
  <div class="dialog-actions-row">
    <!-- Status Toggle -->
    <el-switch
      v-model="isActive"
      size="small"
      :active-text="$t('Active')"
      :inactive-text="$t('Inactive')"
    />
    
    <!-- AI Agent Mode Toggle (only show when detected as AI Agent) -->
    <el-switch
      v-if="detectedIntegrationType === IntegrationType.AIAgent"
      v-model="isAIAgentMode"
      size="small"
      :active-text="$t('AI Agent')"
      :inactive-text="$t('Standard')"
      class="ai-mode-switch"
    />
    
    <!-- Paste Button -->
    <el-button size="small" @click="openPasteDialog" type="primary" plain>
      <el-icon><icon-document-copy /></el-icon>&nbsp;
      {{ $t('Paste') }}
    </el-button>
  </div>
</template>

<style scoped>
.dialog-actions-row {
  position: absolute;
  inset-block-start: 10px;
  inset-inline-end: 55px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-mode-switch {
  border-inline-start: 1px solid var(--el-border-color-lighter);
  padding-inline-start: 10px;
}

@media (max-width: 768px) {
  .dialog-actions-row {
    position: static;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  
  .ai-mode-switch {
    border-inline-start: none;
    padding-inline-start: 0;
  }
}
</style>
