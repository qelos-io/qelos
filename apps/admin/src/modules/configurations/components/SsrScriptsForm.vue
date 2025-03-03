<template>
  <el-form @submit.native.prevent="save" class="ssr-scripts-form">
    <el-form-item label="Enter head">
      <Monaco v-model="edited.head"
              language="html"/>
    </el-form-item>
    <el-form-item label="Enter body">
      <Monaco v-model="edited.body"
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
import { ref } from 'vue';

const props = defineProps({
  kind: String,
  metadata: Object as () => ({ head: string, body: string }),
  submitting: Boolean
})


const defaultMetadata = {
  head: `<link rel="icon" href="/favicon.ico" /><title>APP</title>`,
  body: ''
}
const edited = ref({
  head: props.metadata?.head || defaultMetadata.head,
  body: props.metadata?.body || defaultMetadata.body
})
const emit = defineEmits(['save']);


function save() {
  emit('save', clearNulls(edited.value))
}
</script>

