<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { IIntegration } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import Monaco from '@/modules/users/components/Monaco.vue';

const visible = defineModel<boolean>('visible')
const props = defineProps<{ editingIntegration?: any }>()
defineEmits(['close', 'save'])

const model = ref<any>();

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
  dataManipulation: []
})

const triggerDetails = computed({
  get: () => JSON.stringify(form.trigger.details, null, 2),
  set: (value) => {
    try {
      form.trigger.details = JSON.parse(value)
    } catch (e) {
      console.error(e)
    }
  }
});
const targetDetails = computed({
  get: () => JSON.stringify(form.target.details, null, 2),
  set: (value) => {
    try {
      form.target.details = JSON.parse(value)
    } catch (e) {
      console.error(e)
    }
  }
});
const dataManipulation = computed({
  get: () => JSON.stringify(form.dataManipulation, null, 2),
  set: (value) => {
    try {
      form.dataManipulation = JSON.parse(value)
    } catch (e) {
      console.error(e)
    }
  }
});

watch(visible, () => {
  if (visible.value) {
    model.value = props.editingIntegration || {};
  }
})
</script>

<template>
  <el-dialog v-model="visible" :title="$t(editingIntegration?._id ? 'Edit Integration' : 'Create Integration')"
             width="50%"
             @close="$emit('close', $event)">
    <el-form v-if="visible">
      <el-tabs>
        <el-tab-pane :label="$t('Trigger')">
          <FormInput v-model="form.trigger.source" title="Connection" label="Connection that will trigger this workflow"/>
          <FormInput v-model="form.trigger.operation" title="Operation" label="Operation that will trigger this workflow"/>
          <Monaco v-model="triggerDetails" />
        </el-tab-pane>
        <el-tab-pane :label="$t('Data Manipulation')">
          <Monaco v-model="dataManipulation"/>
        </el-tab-pane>
        <el-tab-pane :label="$t('Target')">
          <FormInput v-model="form.target.source" title="Connection"
                     label="Connection that will be triggered by this workflow"/>
          <FormInput v-model="form.target.operation" title="Operation"
                     label="Operation that will be triggered by this workflow"/>
          <Monaco v-model="targetDetails" />
        </el-tab-pane>

      </el-tabs>
      <el-form-item>
        <el-button type="primary">{{ $t('Save') }}</el-button>
        <el-button @click="$emit('close')">{{ $t('Cancel') }}</el-button>
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<style scoped>

</style>