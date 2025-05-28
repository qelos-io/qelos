<script setup lang="ts">
import { computed, reactive, watch, toValue, ref, onMounted, nextTick } from 'vue';
import { IIntegration, IntegrationSourceKind } from '@qelos/global-types';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import integrationsService from '@/services/integrations-service';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';

// Import tab components
import TriggerTab from '@/modules/integrations/components/tabs/TriggerTab.vue';
import DataManipulationTab from '@/modules/integrations/components/tabs/DataManipulationTab.vue';
import TargetTab from '@/modules/integrations/components/tabs/TargetTab.vue';

const visible = defineModel<boolean>('visible')
const props = defineProps<{ editingIntegration?: any }>()
const emit = defineEmits(['close', 'saved'])

const store = useIntegrationSourcesStore();

const form = reactive<Pick<IIntegration, 'trigger' | 'target' | 'dataManipulation'>>({
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
  ]
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
}, {}, () => {
  emit('close')
  emit('saved', form)
})

</script>

<template>
  <el-dialog top="2vh" v-model="visible"
             class="integration-form-modal"
             :title="$t(props.editingIntegration?._id ? 'Edit Integration' : 'New Integration')"
             :width="$isMobile ? '100%' : '70%'"
             :fullscreen="$isMobile"
             @close="$emit('close', $event)">
    <el-form v-if="visible" @submit.prevent="submit" class="form-content">
      <el-tabs>
        <el-tab-pane :label="$t('Trigger')">
          <TriggerTab v-model="form.trigger" />
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