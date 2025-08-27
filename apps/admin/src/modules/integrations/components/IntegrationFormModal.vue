<script setup lang="ts">
import { reactive, watch, nextTick, ref } from 'vue';
import { IIntegration, IntegrationSourceKind } from '@qelos/global-types';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import integrationsService from '@/services/integrations-service';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { ElMessage } from 'element-plus';

// Import tab components
import TriggerTab from '@/modules/integrations/components/tabs/TriggerTab.vue';
import DataManipulationTab from '@/modules/integrations/components/tabs/DataManipulationTab.vue';
import TargetTab from '@/modules/integrations/components/tabs/TargetTab.vue';
import { DocumentCopy } from '@element-plus/icons-vue';

const visible = defineModel<boolean>('visible')
const props = defineProps<{ editingIntegration?: any }>()
const emit = defineEmits(['close', 'saved'])

const pasteDialogVisible = ref(false)
const pasteContent = ref('')
const pasteError = ref('')

const store = useIntegrationSourcesStore();

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

// Find Qelos integration source for default target
const findQelosSource = () => {
  if (!store.result?.length) return '';
  const qelosSource = store.result.find(source => source.kind === IntegrationSourceKind.Qelos);
  return qelosSource?._id || '';
}

watch(visible, () => {
  if (visible.value) {
    Object.assign(form, props.editingIntegration || {});
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

</script>

<template>
  <el-dialog top="2vh" v-model="visible"
             class="integration-form-modal"
             :title="$t(props.editingIntegration?._id ? 'Edit Integration' : 'New Integration')"
             :width="$isMobile ? '100%' : '70%'"
             :fullscreen="$isMobile"
             @close="$emit('close', $event)">
    <div class="dialog-actions-row">
      <div class="compact-status-toggle">
        <span class="status-indicator" :class="{ 'active': form.active }" />
        <el-switch
          v-model="form.active"
          class="status-switch"
          :inactive-color="'#909399'"
          size="small"
        />
        <span class="toggle-label">{{ form.active ? $t('Active') : $t('Inactive') }}</span>
      </div>
      <el-button size="small" @click="openPasteDialog" type="primary" plain>
        <el-icon><document-copy /></el-icon>
        {{ $t('Paste Integration') }}
      </el-button>
    </div>
    <el-form v-if="visible" @submit.prevent="submit" class="form-content">
      <el-tabs>
        <el-tab-pane :label="$t('Trigger')">
          <TriggerTab v-model="form.trigger" :integration-id="props.editingIntegration?._id" />
        </el-tab-pane>
        <el-tab-pane :label="$t('Data Manipulation')">
          <DataManipulationTab v-model="form.dataManipulation" />
        </el-tab-pane>
        <el-tab-pane :label="$t('Target')">
          <TargetTab v-model="form.target" />
        </el-tab-pane>
      </el-tabs>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" @click="submit" :disabled="submitting" :loading="submitting">{{ $t('Save') }}</el-button>
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

.dialog-actions-row {
  position: absolute;
  top: 5px;
  right: 55px;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

@media (max-width: 768px) {
  .dialog-actions-row {
    position: inherit;
    margin-bottom: 10px;
  }
}

.compact-status-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 16px;
  background-color: var(--el-fill-color-light);
  transition: all 0.2s ease;
  border: 1px solid var(--el-border-color-lighter);
}

.compact-status-toggle .status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--el-color-danger);
  transition: background-color 0.3s ease;
}

.compact-status-toggle .status-indicator.active {
  background-color: var(--el-color-success);
}

.compact-status-toggle .toggle-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .dialog-actions-row {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }
}

.paste-instructions {
  margin-bottom: 10px;
  color: var(--el-text-color-secondary);
}

.mb-3 {
  margin-bottom: 12px;
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