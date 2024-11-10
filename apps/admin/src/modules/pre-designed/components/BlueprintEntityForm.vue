<script setup lang="ts">
import { useRouter } from 'vue-router';
import GeneralForm from '@/modules/pre-designed/components/GeneralForm.vue';
import sdk from '@/services/sdk';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';

const router = useRouter();

const props = defineProps<{
  blueprint: string,
  data?: any | Promise<any>,
  successMsg?: string;
  errorMsg?: string;
  clearAfterSubmit?: boolean;
  navigateAfterSubmit?: string;
}>()

const onSubmit = (form) => sdk.blueprints.entitiesOf(props.blueprint).create({ metadata: form })

const { reloadBlueprintRequirements } = useScreenRequirementsStore();

function afterSubmit(result: any) {
  reloadBlueprintRequirements(props.blueprint);
  if (props.navigateAfterSubmit) {
    router.push({
      name: props.navigateAfterSubmit,
      params: {
        identifier: result.identifier
      }
    })
  }
}
</script>

<template>
  <GeneralForm :on-submit="onSubmit" @submitted="afterSubmit" v-bind="props">
    <template #default="context">
      <slot v-bind="context"/>
    </template>
  </GeneralForm>
</template>

<style scoped>

</style>