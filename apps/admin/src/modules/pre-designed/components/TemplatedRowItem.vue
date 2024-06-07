<script setup lang="ts">
import VRuntimeTemplate from 'vue3-runtime-template';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import { useAuth } from '@/modules/core/compositions/authentication';

defineProps<{ row: any, header?: string, content: string, actions?: string, identifierKey: string }>()
const emit = defineEmits(['remove', 'edit', 'view'])

const askBeforeRemove = useConfirmAction(() => emit('remove'));

const { user } = useAuth()
</script>

<template>
  <BlockItem v-bind="row.$attr || {}">
    <template #title v-if="header">
      <VRuntimeTemplate :template="header" :template-props="{row, user}"/>
    </template>
    <div class="metadata" v-if="content">
      <VRuntimeTemplate :template="content" :template-props="{row, user}"/>
    </div>
    <template #actions>
      <VRuntimeTemplate :template="actions"
                        :template-props="{row, user}"
                        @remove="askBeforeRemove"
                        @edit="emit('edit')"
                        @view="emit('view')"
      />
    </template>
  </BlockItem>
</template>

<style scoped>

</style>