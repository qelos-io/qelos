<script setup lang="ts">
import { computed, reactive, watch, toValue } from 'vue';
import { IIntegration } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import integrationsService from '@/services/integrations-service';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import {
  useIntegrationKindsTargetOperations,
  useIntegrationKindsTriggerOperations
} from '@/modules/integrations/compositions/integration-kinds-operations';

const visible = defineModel<boolean>('visible')
const props = defineProps<{ editingIntegration?: any }>()
const emit = defineEmits(['close', 'saved'])

const kinds = useIntegrationKinds();
const store = useIntegrationSourcesStore();
const triggerOperations = useIntegrationKindsTriggerOperations();
const targetOperations = useIntegrationKindsTargetOperations();

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

const triggerDetails = computed({
  get: () => JSON.stringify(form.trigger.details, null, 2),
  set: (value) => {
    try {
      form.trigger.details = JSON.parse(value)
    } catch (e) {
      //console.error(e)
    }
  }
});
const targetDetails = computed({
  get: () => JSON.stringify(form.target.details, null, 2),
  set: (value) => {
    try {
      form.target.details = JSON.parse(value)
    } catch (e) {
      //console.error(e)
    }
  }
});
const dataManipulation = computed({
  get: () => JSON.stringify(form.dataManipulation, null, 2),
  set: (value) => {
    try {
      form.dataManipulation = (JSON.parse(value) || []).map((row: any) => {
        delete row._id;
        return row;
      })
    } catch (e) {
      //console.error(e)
    }
  }
});

const selectedTriggerSource = computed(() => store.result?.find(s => s._id === form.trigger.source));
const selectedTargetSource = computed(() => store.result?.find(s => s._id === form.target.source));

watch([() => form.trigger.operation, () => form.trigger.source], () => {
  if (props.editingIntegration?._id) {
    if (form.trigger.operation === props.editingIntegration.trigger.operation && form.trigger.source === props.editingIntegration.trigger.source) {
      form.trigger.details = JSON.parse(JSON.stringify(props.editingIntegration.trigger.details));
      return; // already set
    }
  }
  const operation = triggerOperations[selectedTriggerSource.value?.kind]?.find(o => o.name === form.trigger.operation)
  form.trigger.details = JSON.parse(JSON.stringify(operation?.details || {}));
});
watch(selectedTargetSource, () => {
  if (props.editingIntegration?._id) {
    if (form.target.operation === props.editingIntegration.target.operation && form.target.source === props.editingIntegration.target.source) {
      form.target.details = JSON.parse(JSON.stringify(props.editingIntegration.target.details));
      return; // already set
    }
  }
  const operation = targetOperations[selectedTargetSource.value?.kind]?.find(o => o.name === form.target.operation)
  form.target.details = JSON.parse(JSON.stringify(operation?.details || {}));
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
             :title="$t(props.editingIntegration?._id ? 'Edit Integration' : 'Create Integration')"
             width="50%"
             @close="$emit('close', $event)">
    <el-form v-if="visible" @submit.prevent="submit">
      <el-tabs>
        <el-tab-pane :label="$t('Trigger')">
          <FormInput type="select" v-model="form.trigger.source" title="Connection"
                     @change="form.trigger.operation = ''"
                     label="Connection that will trigger this workflow">
            <template #options>
              <el-option v-for="source in store.result"
                         :key="source._id"
                         :value="source._id"
                         :label="source.name" class="flex-row flex-middle">
                <img v-if="kinds[source.kind].logo" :src="kinds[source.kind].logo"
                     :alt="kinds[source.kind].name"/>
                <small v-else>{{ kinds[source.kind].name }}</small>
                {{ source.name }}
              </el-option>
            </template>
          </FormInput>
          <FormInput v-model="form.trigger.operation" title="Operation"
                     type="select"
                     :options="triggerOperations[selectedTriggerSource?.kind] || []"
                     option-value="name"
                     option-label="label"
                     label="Operation that will trigger this workflow"/>
          <Monaco v-model="triggerDetails"/>
        </el-tab-pane>
        <el-tab-pane :label="$t('Data Manipulation')">
          <Monaco v-model="dataManipulation"/>
        </el-tab-pane>
        <el-tab-pane :label="$t('Target')">
          <FormInput type="select" v-model="form.target.source" title="Connection"
                     label="Connection that will be triggered by this workflow">
            <template #options>
              <el-option v-for="source in store.result"
                         :key="source._id"
                         :value="source._id"
                         :label="source.name" class="flex-row flex-middle">
                <img v-if="kinds[source.kind].logo" :src="kinds[source.kind].logo"
                     :alt="kinds[source.kind].name"/>
                <small v-else>{{ kinds[source.kind].name }}</small>
                {{ source.name }}
              </el-option>
            </template>
          </FormInput>
          <FormInput v-model="form.target.operation" title="Operation"
                     type="select"
                     :options="targetOperations[selectedTargetSource?.kind]"
                     option-value="name"
                     option-label="label"
                     label="Operation that will be triggered by this workflow"/>
          <Monaco v-model="targetDetails"/>
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
</style>