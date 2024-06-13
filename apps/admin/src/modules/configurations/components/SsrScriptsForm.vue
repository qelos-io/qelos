<template>
  <el-form @submit.native.prevent="save" class="ssr-scripts-form">
    <el-form-item label="Enter head">
      <Monaco :model-value="updated.head || defaultMetadata.head" @keyup="edited.head = $event.target.value"
              language="html"/>
    </el-form-item>
    <el-form-item label="Enter body">
      <Monaco :model-value="updated.body || defaultMetadata.body" @keyup="edited.body = $event.target.value"
              language="html"/>
    </el-form-item>

    <SaveButton :submitting="submitting"/>
  </el-form>
</template>

<script lang="ts" setup>
import Monaco from '../../users/components/Monaco.vue'
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { clearNulls } from '../../core/utils/clear-nulls';
import { useEditMetadata } from '../compositions/metadata';

const props = defineProps({
  kind: String,
  metadata: Object as () => ({ head: string, body: string }),
  submitting: Boolean
})
const { updated, edited } = useEditMetadata<typeof props.metadata>(props.kind, props.metadata || {})
const emit = defineEmits(['save']);

const defaultMetadata = {
  head: `<link rel="icon" href="/favicon.ico" /><title>APP</title>`,
  body: ''
}

function save() {
  emit('save', clearNulls(edited))
}
</script>

