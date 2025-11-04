<script setup lang="ts">
import { reactive, watch, nextTick, ref, computed } from 'vue';
import { IIntegration, IntegrationSourceKind, QelosTriggerOperation } from '@qelos/global-types';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import integrationsService from '@/services/integrations-service';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { ElMessage } from 'element-plus';
import { detectIntegrationType, IntegrationType } from '@/modules/integrations/utils/integration-type-detector';

// Import tab components
import TriggerTab from '@/modules/integrations/components/tabs/TriggerTab.vue';
import DataManipulationTab from '@/modules/integrations/components/tabs/DataManipulationTab.vue';
import TargetTab from '@/modules/integrations/components/tabs/TargetTab.vue';
import FunctionToolsTab from '@/modules/integrations/components/tabs/FunctionToolsTab.vue';

// Import specialized form components
import AIAgentForm from '@/modules/integrations/components/forms/AIAgentForm.vue';
import IntegrationFormModalHeader from '@/modules/integrations/components/IntegrationFormModalHeader.vue';

const visible = defineModel<boolean>('visible')
const props = defineProps<{ editingIntegration?: any }>()
const emit = defineEmits(['close', 'saved'])

const pasteDialogVisible = ref(false)
const pasteContent = ref('')
const pasteError = ref('')

const store = useIntegrationSourcesStore();

// View mode state
const selectedViewMode = ref<IntegrationType>(IntegrationType.Standard);
const showModeSelection = ref(false);

// AI Agent wizard step state
const aiAgentCurrentStep = ref(0);
const totalAIAgentSteps = 4;

const form = reactive<Pick<IIntegration, 'trigger' | 'target' | 'dataManipulation' | 'active'>>({
  trigger: {
    source: '',
    operation: '',
    details: {}
  },
  target: {
    source: '',
    operation: '',
    details: {}
  },
  dataManipulation: [
    {
      'map': {},
      'populate': {
        user: {
          source: 'user'
        },
        workspace: {
          source: 'workspace'
        }
      }
    },
    {
      map: {
        userEmail: '.user.email',
        workspaceMembers: '.workspace.members | map(.user)'
      },
      populate: {}
    },
    {
      map: {},
      populate: {
        workspaceMembers: {
          source: 'user'
        }
      }
    }
  ],
  active: false
})

// Computed property to check if the integration is a chat completion integration
const isChatCompletionIntegration = computed(() => {
  return form.trigger?.source && 
         form.trigger?.operation === QelosTriggerOperation.chatCompletion;
});

// Update selected view mode when form changes (for auto-detection)
watch(() => [form.trigger, form.target, store.result], () => {
  if (!props.editingIntegration?._id && store.result?.length) {
    const detectedType = detectIntegrationType(form, store.result);
    if (detectedType === IntegrationType.AIAgent) {
      selectedViewMode.value = IntegrationType.AIAgent;
    }
  }
}, { immediate: true, deep: true });

// Find Qelos integration source for default target
const findQelosSource = () => {
  if (!store.result?.length) return '';
  const qelosSource = store.result.find(source => source.kind === IntegrationSourceKind.Qelos);
  return qelosSource?._id || '';
}

watch(visible, () => {
  if (visible.value) {
    aiAgentCurrentStep.value = 0;
    Object.assign(form, {
      ...(props.editingIntegration || {}),
      trigger: {
        source: '',
        operation: '',
        details: {},
        ...(props.editingIntegration?.trigger || {})
      },
      target: {
        source: '',
        operation: '',
        details: {},
        ...(props.editingIntegration?.target || {})
      },
      dataManipulation: props.editingIntegration?.dataManipulation || [
        {
          'map': {},
          'populate': {
            user: {
              source: 'user'
            },
            workspace: {
              source: 'workspace'
            }
          }
        },
        {
          map: {
            userEmail: '.user.email',
            workspaceMembers: '.workspace.members | map(.user)'
          },
          populate: {}
        },
        {
          map: {},
          populate: {
            workspaceMembers: {
              source: 'user'
            }
          }
        }
      ],
      active: props.editingIntegration?.active || false,
    });
    
    // Set view mode based on editing integration
    if (props.editingIntegration?._id && store.result?.length) {
      const detectedType = detectIntegrationType(form, store.result);
      selectedViewMode.value = detectedType;
      showModeSelection.value = false;
    } else {
      selectedViewMode.value = IntegrationType.Standard;
      showModeSelection.value = true; // Show mode selection for new integrations
    }
    form.dataManipulation = (form.dataManipulation || []).map((row: any) => {
      delete row._id;
      return row;
    })
    
    // For new integrations, set default target as Qelos with webhook operation
    if (!props.editingIntegration?._id) {
      // Wait for store to be populated
      nextTick(() => {
        if (store.result?.length) {
          const qelosSourceId = findQelosSource();
          if (qelosSourceId) {
            form.target.source = qelosSourceId;
            form.target.operation = 'webhook';
            form.target.details = {};
          }
        }
      });
    }
  }
}, { immediate: true })

const { submit, submitting } = useSubmitting(() => {
  if (props.editingIntegration?._id) {
    return integrationsService.update(props.editingIntegration?._id, form)
  } else {
    return integrationsService.create(form)
  }
}, {
  error: (err: any) => err?.response?.data?.message || 'Failed to save integration'
}, () => {
  emit('close')
  emit('saved', form)
})

const openPasteDialog = () => {
  pasteDialogVisible.value = true
  pasteContent.value = ''
  pasteError.value = ''
}

const applyPastedIntegration = () => {
  try {
    pasteError.value = ''
    const parsedContent = JSON.parse(pasteContent.value)
    
    // Validate that the pasted content has the required structure
    if (!parsedContent.trigger || !parsedContent.target) {
      pasteError.value = 'Invalid integration object. Must contain trigger and target properties.'
      return
    }
    
    // Apply the pasted content to the form
    form.trigger = parsedContent.trigger
    form.target = parsedContent.target
    
    // Always reset data manipulation and replace with pasted content or empty array
    if (parsedContent.dataManipulation && Array.isArray(parsedContent.dataManipulation)) {
      form.dataManipulation = parsedContent.dataManipulation.map((row: any) => {
        const newRow = { ...row }
        delete newRow._id
        return newRow
      })
    } else {
      // If no data manipulation in pasted content, set to empty array
      form.dataManipulation = []
    }
    
    pasteDialogVisible.value = false
    ElMessage.success('Integration object applied successfully')
  } catch (error) {
    pasteError.value = 'Invalid JSON format. Please check your input.'
  }
}

// AI Agent navigation functions
const goToNextStep = () => {
  if (aiAgentCurrentStep.value < totalAIAgentSteps - 1) {
    aiAgentCurrentStep.value++;
  }
};

const goToPreviousStep = () => {
  if (aiAgentCurrentStep.value > 0) {
    aiAgentCurrentStep.value--;
  }
};

const isAIAgentView = computed(() => selectedViewMode.value === IntegrationType.AIAgent);
const canGoNext = computed(() => isAIAgentView.value && aiAgentCurrentStep.value < totalAIAgentSteps - 1);
const canGoPrevious = computed(() => isAIAgentView.value && aiAgentCurrentStep.value > 0);
const isLastStep = computed(() => isAIAgentView.value && aiAgentCurrentStep.value === totalAIAgentSteps - 1);

const selectMode = (mode: IntegrationType) => {
  selectedViewMode.value = mode;
  showModeSelection.value = false;
};

</script>

<template>
  <el-dialog top="2vh" v-model="visible"
             class="integration-form-modal"
             :title="$t(props.editingIntegration?._id ? 'Edit Integration' : 'New Integration')"
             :width="$isMobile ? '100%' : '70%'"
             :fullscreen="$isMobile"
             @close="$emit('close', $event)">
    <!-- Mode Selection View for New Integrations -->
    <el-card v-if="showModeSelection" class="mode-selection-card">
      <template #header>
        <div class="card-header">
          <h3>{{ $t('Choose Integration Mode') }}</h3>
          <p class="subtitle">{{ $t('Select how you want to build your integration') }}</p>
        </div>
      </template>
      
      <div class="mode-options">
        <div class="mode-option" @click="selectMode(IntegrationType.Standard)">
          <div class="option-icon">
            <el-icon :size="24"><icon-setting /></el-icon>
          </div>
          <div class="option-content">
            <h4>{{ $t('Standard Mode') }}</h4>
            <p>{{ $t('Full control with trigger, data manipulation, and target configuration') }}</p>
          </div>
        </div>
        
        <div class="mode-option" @click="selectMode(IntegrationType.AIAgent)">
          <div class="option-icon ai-icon">
            <el-icon :size="24"><icon-magic-stick /></el-icon>
          </div>
          <div class="option-content">
            <h4>{{ $t('AI Agent Mode') }}</h4>
            <p>{{ $t('Create an intelligent agent with tools and conversational capabilities') }}</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- Integration Form -->
    <template v-else>
      <IntegrationFormModalHeader
        v-model:active="form.active"
        v-model:view-mode="selectedViewMode"
        :integration-form="form"
        :sources="store.result || []"
        @paste="openPasteDialog"
      />
      <el-form v-if="visible" @submit.prevent="submit" class="form-content">
        <!-- AI Agent Form View -->
        <div v-if="selectedViewMode === IntegrationType.AIAgent" class="ai-agent-view">
          <AIAgentForm
            v-model="form"
            v-model:current-step="aiAgentCurrentStep"
            :integration-id="props.editingIntegration?._id"
          />
        </div>

        <!-- Standard Integration Form View -->
        <el-tabs v-else>
          <el-tab-pane :label="$t('Trigger')">
            <TriggerTab v-model="form.trigger" :integration-id="props.editingIntegration?._id" />
          </el-tab-pane>
          <el-tab-pane :label="$t('Data Manipulation')">
            <DataManipulationTab v-model="form.dataManipulation" />
          </el-tab-pane>
          <el-tab-pane :label="$t('Target')">
            <TargetTab v-model="form.target" :integration-id="props.editingIntegration?._id" />
          </el-tab-pane>
          <el-tab-pane v-if="isChatCompletionIntegration" :label="$t('Function Tools')">
            <FunctionToolsTab v-if="props.editingIntegration?._id" :integration-id="props.editingIntegration?._id" />
            <el-alert v-else :title="$t('Please save the integration first')" type="warning" show-icon />
          </el-tab-pane>
        </el-tabs>
      </el-form>
    </template>
    
    <template #footer>
      <div class="dialog-footer">
        <!-- Mode Selection Footer -->
        <template v-if="showModeSelection">
          <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
        </template>
        
        <!-- AI Agent Mode Footer -->
        <template v-else-if="isAIAgentView">
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
        
        <!-- Standard Mode Footer -->
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
  margin-right: 20px;
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
    margin-right: 16px;
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
    max-height: calc(90vh - 240px);
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
  max-height: 90%;
  overflow: auto;
}

.integration-form-modal :deep(.el-dialog) {
  max-height: 90vh;
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