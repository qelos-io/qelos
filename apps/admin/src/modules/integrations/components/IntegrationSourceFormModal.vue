<script setup lang="ts">
import IntegrationSourceForm from '@/modules/integrations/IntegrationSourceForm.vue';
import { ref, watch } from 'vue';
import { useIntegrationKinds } from '../compositions/integration-kinds';

const visible = defineModel<boolean>('visible')
const props = defineProps<{ editingIntegration?: any, kind: string }>()
defineEmits(['close', 'save']);

const model = ref<any>();

watch(visible, () => {
  if (visible.value) {
    model.value = props.editingIntegration || {};
  }
})

const kinds = useIntegrationKinds();
</script>

<template>
  <!-- Modal -->
  <el-dialog v-model="visible"
             width="50%"
             @close="$emit('close', $event)">
             <template #title>
              <span class="vertical-align" v-if="kinds[props.kind]?.logo"><img :src="kinds[props.kind]?.logo" alt=""/></span>
              <span class="vertical-align">{{ $t(editingIntegration?._id ? 'Edit Connection' : 'Create Connection') + ': ' + kinds[props.kind]?.name }}</span>
             </template>
    <IntegrationSourceForm v-if="visible && model" v-model="model" :kind="kind" @submit="$emit('save', $event)"
                           @close="$emit('close', $event)"/>
  </el-dialog>
</template>

<style scoped>
.vertical-align {
  vertical-align: middle;
}
img {
  margin-block: 0;  
  margin-inline-end: 10px;
  vertical-align: middle;
  width: 20px;
  height: 20px;
}
</style>