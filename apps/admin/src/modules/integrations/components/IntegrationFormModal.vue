<script setup lang="ts">
import { computed, reactive, watch, toValue, ref, onMounted } from 'vue';
import { IIntegration } from '@qelos/global-types';
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

watch(visible, () => {
  if (visible.value) {
    Object.assign(form, props.editingIntegration || {});
    form.dataManipulation = (form.dataManipulation || []).map((row: any) => {
      delete row._id;
      return row;
    })
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
             :title="$t(props.editingIntegration?._id ? 'Edit Integration' : 'Create Integration')"
             width="50%"
             @close="$emit('close', $event)">
    <el-form v-if="visible" @submit.prevent="submit">
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
      <el-form-item>
        <el-button type="primary" native-type="submit" :disabled="submitting" :loading="submitting">{{ $t('Save') }}</el-button>
        <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
      </el-form-item>
    </el-form>
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
.integration-form-modal {
  max-height: 90vh;
}
</style>