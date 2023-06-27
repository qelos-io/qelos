<script setup lang="ts">
import VRuntimeTemplate from 'vue3-runtime-template';
import GpItem from '@/modules/core/components/layout/GpItem.vue';
import {useConfirmAction} from '@/modules/core/compositions/confirm-action';

defineProps<{ row: any, header?: string, content: string, actions?: string }>()
const emit = defineEmits(['remove', 'edit', 'view'])

const askBeforeRemove = useConfirmAction(() => emit('remove'));

</script>

<template>
  <GpItem>
    <template #title v-if="header">
      <VRuntimeTemplate :template="header" :template-props="{row}"/>
    </template>
    <div class="metadata" v-if="content">
      <VRuntimeTemplate :template="content" :template-props="{row}"/>
    </div>
    <template #actions>
      <VRuntimeTemplate :template="actions"
                        :template-props="{row}"
                        @remove="askBeforeRemove"
                        @edit="emit('edit')"
                        @view="emit('view')"
      />
    </template>
  </GpItem>
</template>

<style scoped>

</style>