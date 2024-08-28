<script setup lang="ts">
import GeneralForm from '@/modules/pre-designed/components/GeneralForm.vue';
import sdk from '@/services/sdk';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';

const props = defineProps<{
  blueprint: string,
  data?: any | Promise<any>,
  successMsg?: string;
  errorMsg?: string;
  clearAfterSubmit?: boolean;
}>()

const onSubmit = (form) => sdk.blueprints.entitiesOf(props.blueprint).create({metadata: form})

const { reloadBlueprintRequirements } = useScreenRequirementsStore();
</script>

<template>
  <GeneralForm :on-submit="onSubmit" @submitted="reloadBlueprintRequirements(props.blueprint)" v-bind="props">
    <template #default="context">
      <slot v-bind="context"/>
    </template>
  </GeneralForm>
</template>

<style scoped>

</style>