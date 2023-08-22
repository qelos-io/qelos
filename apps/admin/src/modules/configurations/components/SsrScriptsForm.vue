
<template>
  <el-form @submit.native.prevent="save" class="ssr-scripts-form">
      <el-form-item label="Enter head">
        <Monaco :model-value="updated.head" @input="edited.head = $event.target.value"/>
      </el-form-item>
      <el-form-item label="Enter body">
        <Monaco :model-value="updated.body" @input="edited.body = $event.target.value" />
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
  metadata: Object,
  submitting: Boolean
})
const { updated, edited } = useEditMetadata(props.kind, props.metadata)
const emit = defineEmits(['save']);

function save() {
  emit('save', clearNulls(edited))
}
</script>

