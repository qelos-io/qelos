<template>
  <el-form @submit.native.prevent="save" class="ssr-scripts-form">
    <form-input type="switch" v-model="edited.active" title="Active"/>

    <el-form-item label="Enter Custom Template">
      <Monaco v-model="edited.html" language="html"/>
    </el-form-item>

    <div class="submit-wrapper">
      <SaveButton :submitting="submitting"/>
    </div>
  </el-form>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import Monaco from '../../users/components/Monaco.vue'
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import { clearNulls } from '../../core/utils/clear-nulls';

const props = defineProps({
  kind: String,
  metadata: Object as () => ({ html: string, active: boolean }),
  submitting: Boolean
})

const defaultMetadata = {
  html: '',
  active: false
}
const edited = ref({
  html: props.metadata?.html || defaultMetadata.html,
  active: props.metadata?.active || defaultMetadata.active
})
const emit = defineEmits(['save']);

function save() {
  emit('save', clearNulls(edited.value))
}
</script>
<style scoped>
.submit-wrapper {
  z-index: 5;
  background-color: var(--body-bg);
  margin: 0;
  padding: 20px;
  position: sticky;
  bottom: 0;
}
</style>

