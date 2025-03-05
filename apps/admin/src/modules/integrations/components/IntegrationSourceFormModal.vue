<script setup lang="ts">
import IntegrationSourceForm from '@/modules/integrations/IntegrationSourceForm.vue';
import { ref, watch } from 'vue';

const visible = defineModel<boolean>('visible')
const props = defineProps<{ editingIntegration?: any, kind: string }>()
defineEmits(['close', 'save'])

const model = ref<any>();

watch(visible, () => {
  if (visible.value) {
    model.value = props.editingIntegration || {};
  }
})
</script>

<template>
  <!-- Modal -->
  <el-dialog v-model="visible" :title="$t(editingIntegration?._id ? 'Edit Connection' : 'Create Connection')"
             width="50%"
             @close="$emit('close', $event)">
    <IntegrationSourceForm v-if="visible && model" v-model="model" :kind="kind" @submit="$emit('save', $event)"
                           @close="$emit('close', $event)"/>
  </el-dialog>
</template>

<style scoped>

</style>