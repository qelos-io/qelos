<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { IIntegration } from '@qelos/global-types';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import integrationsService from '@/services/apis/integrations-service';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { ElMessage } from 'element-plus';
import { IntegrationType } from '@/modules/integrations/utils/integration-type-detector';
import AIAgentForm from '@/modules/integrations/components/forms/AIAgentForm.vue';
import IntegrationFormModalHeader from '@/modules/integrations/components/IntegrationFormModalHeader.vue';
import WorkflowIntegrationView from '@/modules/integrations/components/WorkflowIntegrationView.vue';
import { useIntegrationFormState } from '@/modules/integrations/compositions/use-integration-form-state';

const visible = defineModel<boolean>('visible');
const props = defineProps<{ editingIntegration?: Partial<IIntegration> }>();
const emit = defineEmits(['close', 'saved']);

const pasteDialogVisible = ref(false);
const pasteContent = ref('');
const pasteError = ref('');
const showTypeSelection = ref(false);

const store = useIntegrationSourcesStore();

const {
  form,
  selectedViewMode
} = useIntegrationFormState({ props, visible, sourcesStore: store });

const aiAgentCurrentStep = ref(0);
const totalAIAgentSteps = 5;

const isAIAgentView = computed(() => selectedViewMode.value === IntegrationType.AIAgent);
const isWorkflowView = computed(() => selectedViewMode.value === IntegrationType.Workflow);

const canGoNext = computed(() => isAIAgentView.value && aiAgentCurrentStep.value < totalAIAgentSteps - 1);
const canGoPrevious = computed(() => isAIAgentView.value && aiAgentCurrentStep.value > 0);
const isLastStep = computed(() => isAIAgentView.value && aiAgentCurrentStep.value === totalAIAgentSteps - 1);
const isNewIntegration = computed(() => !props.editingIntegration?._id);

const integrationName = computed(() => form.trigger?.details?.name);

watch(visible, (value) => {
  if (value) {
    aiAgentCurrentStep.value = 0;
    showTypeSelection.value = isNewIntegration.value;
  }
});

const goToNextStep = () => {
  if (canGoNext.value) {
    aiAgentCurrentStep.value++;
  }
};

const goToPreviousStep = () => {
  if (canGoPrevious.value) {
    aiAgentCurrentStep.value--;
  }
};

const selectMode = (mode: IntegrationType) => {
  selectedViewMode.value = mode;
  showTypeSelection.value = false;
};

const { submit, submitting } = useSubmitting(() => {
  if (props.editingIntegration?._id) {
    return integrationsService.update(props.editingIntegration._id, form);
  }
  return integrationsService.create(form);
}, {
  error: (err: any) => err?.response?.data?.message || 'Failed to save integration'
}, () => {
  emit('close');
  emit('saved', form);
});

const openPasteDialog = () => {
  pasteDialogVisible.value = true;
  pasteContent.value = '';
  pasteError.value = '';
};

const applyPastedIntegration = () => {
  try {
    pasteError.value = '';
    const parsedContent = JSON.parse(pasteContent.value);

    if (!parsedContent.trigger || !parsedContent.target) {
      pasteError.value = 'Invalid integration object. Must contain trigger and target properties.';
      return;
    }

    form.trigger = parsedContent.trigger;
    form.target = parsedContent.target;

    if (parsedContent.dataManipulation && Array.isArray(parsedContent.dataManipulation)) {
      form.dataManipulation = parsedContent.dataManipulation.map((row: any) => {
        const newRow = { ...row };
        delete newRow._id;
        return newRow;
      });
    } else {
      form.dataManipulation = [];
    }

    pasteDialogVisible.value = false;
    ElMessage.success('Integration object applied successfully');
  } catch (error) {
    pasteError.value = 'Invalid JSON format. Please check your input.';
  }
};
</script>

<template>
  <el-dialog top="2vh" v-model="visible"
             class="integration-form-modal"
             :title="$t(props.editingIntegration?._id ? 'Edit Integration' : 'New Integration') + (integrationName ? ' - ' + integrationName : '')"
             :width="$isMobile ? '100%' : '90%'"
             :fullscreen="$isMobile"
             @close="$emit('close', $event)">
    <template v-if="showTypeSelection">
      <el-card class="mode-selection-card">
        <template #header>
          <div class="card-header">
            <h3>{{ $t('Choose Integration Mode') }}</h3>
            <p class="subtitle">{{ $t('Select how you want to build your integration') }}</p>
          </div>
        </template>

        <div class="mode-options">
          <div class="mode-option" @click="selectMode(IntegrationType.Workflow)">
            <div class="option-icon">
              <el-icon :size="24"><icon-guide /></el-icon>
            </div>
            <div class="option-content">
              <h4>{{ $t('Workflow View') }}</h4>
              <p>{{ $t('Visual storyline that highlights upstream/downstream automations and every workflow stage.') }}</p>
            </div>
          </div>

          <div class="mode-option" @click="selectMode(IntegrationType.AIAgent)">
            <div class="option-icon ai-icon">
              <el-icon :size="24"><IconMagicStick /></el-icon>
            </div>
            <div class="option-content">
              <h4>{{ $t('AI Agent Mode') }}</h4>
              <p>{{ $t('Guided wizard for conversational agents with function calling and tooling.') }}</p>
            </div>
          </div>
        </div>
      </el-card>
    </template>
    <template v-else>
      <IntegrationFormModalHeader
        v-model:active="form.active"
        v-model:view-mode="selectedViewMode"
        :integration-form="form"
        :sources="store.result || []"
        @paste="openPasteDialog"
      />
      <el-form v-if="visible" @submit.prevent="submit" class="form-content">
        <div v-if="isWorkflowView" class="view-wrapper">
          <WorkflowIntegrationView
            v-model:trigger="form.trigger"
            v-model:target="form.target"
            v-model:data-manipulation="form.dataManipulation"
            :integration-id="props.editingIntegration?._id"
          />
        </div>

        <div v-else-if="isAIAgentView" class="view-wrapper">
          <AIAgentForm
            v-model:trigger="form.trigger"
            v-model:target="form.target"
            v-model:data-manipulation="form.dataManipulation"
            v-model:current-step="aiAgentCurrentStep"
            :integration-id="props.editingIntegration?._id"
          />
        </div>
      </el-form>
    </template>
    
    <template #footer>
      <div class="dialog-footer">
        <!-- Mode Selection Footer -->
        <template v-if="isAIAgentView">
          <div class="ai-agent-footer">
            <div class="step-info">
              <span class="step-text">{{ $t('Step') }} {{ aiAgentCurrentStep + 1 }} {{ $t('of') }} {{ totalAIAgentSteps }}</span>
            </div>
            <div class="footer-actions">
              <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
              <el-button 
                v-if="canGoPrevious"
                @click="goToPreviousStep"
              >
                {{ $t('Previous') }}
              </el-button>
              <el-button 
                v-if="canGoNext"
                type="primary"
                @click="goToNextStep"
              >
                {{ $t('Next') }}
              </el-button>
              <el-button 
                v-if="isLastStep"
                type="success"
                @click="submit" 
                :disabled="submitting" 
                :loading="submitting"
              >
                {{ $t('Save Agent') }}
              </el-button>
            </div>
          </div>
        </template>
        
        <!-- Standard / Workflow Footer -->
        <template v-else>
          <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
          <el-button type="primary" @click="submit" :disabled="submitting" :loading="submitting">{{ $t('Save') }}</el-button>
        </template>
      </div>
    </template>
  </el-dialog>
  
  <!-- Paste Integration Dialog -->
  <el-dialog
    v-model="pasteDialogVisible"
    :title="$t('Paste Integration Object')"
    width="50%"
    append-to-body
  >
    <el-alert
      v-if="pasteError"
      :title="pasteError"
      type="error"
      show-icon
      :closable="false"
      class="mb-3"
    />
    <p class="paste-instructions">{{ $t('Paste a valid integration JSON object below:') }}</p>
    <el-input
      v-model="pasteContent"
      type="textarea"
      :rows="10"
      :placeholder="$t('Paste JSON here...')"
    />
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="pasteDialogVisible = false">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" @click="applyPastedIntegration">{{ $t('Apply') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.tag {
  margin: 5px;
  cursor: pointer;
}

img {
  border-radius: 0;
  height: 20px;
  margin: 0;
}

img, small {
  margin-inline-end: 10px;
  font-weight: bold;
  font-style: italic;
}

.paste-instructions {
  margin-bottom: 10px;
  color: var(--el-text-color-secondary);
}

.mb-3 {
  margin-bottom: 12px;
}

/* Mode Selection Card Styles */
.mode-selection-card {
  border: none;
  box-shadow: none;
}

.mode-selection-card :deep(.el-card__header) {
  padding: 24px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.mode-selection-card :deep(.el-card__body) {
  padding: 24px;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.card-header .subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.mode-option {
  display: flex;
  align-items: center;
  padding: 24px;
  border-radius: 8px;
  border: 2px solid var(--el-border-color);
  transition: all 0.3s;
  cursor: pointer;
  background-color: var(--el-bg-color);
}

.mode-option:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  border-color: var(--el-color-primary);
}

.option-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  margin-inline-end: 20px;
  flex-shrink: 0;
}

.option-icon.ai-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.option-content {
  flex: 1;
}

.option-content h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.option-content p {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .mode-options {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .mode-option {
    padding: 20px;
  }
  
  .option-icon {
    width: 48px;
    height: 48px;
    margin-inline-end: 16px;
  }
  
  .option-content h4 {
    font-size: 16px;
  }
  
  .option-content p {
    font-size: 13px;
  }
}

@media (min-width: 768px) {
  .form-content {
    max-height: calc(90vh - 130px);
    overflow-y: auto;
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding: 10px 20px;
}

.ai-agent-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.step-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.footer-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .ai-agent-footer {
    flex-direction: column;
    gap: 12px;
  }
  
  .step-info {
    width: 100%;
    justify-content: center;
  }
  
  .footer-actions {
    width: 100%;
    justify-content: flex-end;
  }
}

</style>
<style>
.integration-form-modal {
  height: 90%;
  overflow: auto;
}

.integration-form-modal :deep(.el-dialog) {
  height: 90vh;
  display: flex;
  flex-direction: column;
}

.integration-form-modal :deep(.el-dialog__body) {
  overflow-y: auto;
  flex: 1;
  padding: 20px;
}

@media (max-width: 768px) {
  .integration-form-modal :deep(.el-dialog) {
    width: 100% !important;
    margin: 0 !important;
  }

  .integration-form-modal.el-dialog .el-dialog__body {
    height: calc(100% - 100px);
    overflow-y: auto;
  }
}
</style>