<script setup lang="ts">
import { useRouter } from 'vue-router';
import GeneralForm from '@/modules/pre-designed/components/GeneralForm.vue';
import sdk from '@/services/sdk';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';
import ErrorBoundary from '@/modules/core/components/layout/ErrorBoundary.vue';

const router = useRouter();

const props = defineProps<{
  blueprint: string,
  data?: any | Promise<any>,
  successMsg?: string;
  errorMsg?: string;
  clearAfterSubmit?: boolean;
  navigateAfterSubmit?: string | any;
  beforeSubmit?: (data: any) => Promise<unknown>;
  afterSubmit?: (data: any) => Promise<unknown>;
  identifier?: string;
}>()

const onSubmit = async (form) => {
  if (typeof props.beforeSubmit === 'function') {
    await props.beforeSubmit(form);
  }
  if (props.identifier) {
    return sdk.blueprints.entitiesOf(props.blueprint).update(props.identifier, { metadata: form })
  } else {
    return sdk.blueprints.entitiesOf(props.blueprint).create({ metadata: form })
  }
}

const { reloadBlueprintRequirements } = useScreenRequirementsStore();

async function afterSubmit(result: any) {
  reloadBlueprintRequirements(props.blueprint);
  if (typeof props.afterSubmit === 'function') {
    await props.afterSubmit(result);
  }
  if (props.navigateAfterSubmit) {
    router.push(typeof props.navigateAfterSubmit === 'string' ? {
      name: props.navigateAfterSubmit,
      params: {
        identifier: result.identifier
      }
    } : props.navigateAfterSubmit)
  }
}
</script>

<template>
  <ErrorBoundary>
    <GeneralForm :on-submit="onSubmit" @submitted="afterSubmit" v-bind="props">
      <template #default="context">
        <slot v-bind="context"/>
      </template>
    </GeneralForm>
  </ErrorBoundary>
</template>

<style scoped>

</style>