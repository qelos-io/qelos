<template>
  <main>
    <el-form @submit.prevent="submit">
      <VRuntimeTemplate :template="relevantStructure" :template-props="{row: item, schema: crud.schema}"/>
    </el-form>
  </main>
</template>

<script lang="ts" setup>
import {useRoute} from 'vue-router';
import {computed, ref, watch} from 'vue';
import {useSubmitting} from '@/modules/core/compositions/submitting';
import {usePluginsMicroFrontends} from '@/modules/plugins/store/plugins-microfrontends';
import VRuntimeTemplate from 'vue3-runtime-template';

const route = useRoute();
const mfes = usePluginsMicroFrontends();

const crud = computed(() => {
  const crud = route.meta.crud as any || {display: {}};
  const screens: any = crud.screens || {}
  return {
    ...crud,
    display: {
      name: 'item',
      capitalizedPlural: 'Items',
      ...(crud.display || {}),
    },
    screens: {
      create: screens.create,
      edit: screens.edit,
      view: screens.view
    },
  }
});
const api = computed(() => mfes.cruds[crud.value.name]);
const isExistingItem = computed(() => !!route.params.id);
const relevantStructure = computed(() => {
  return (route.meta.mfe as any)?.structure;
});
const item = ref({});

const {submit, submitting} = useSubmitting(async () => {
  if (isExistingItem.value) {
    return api.value.update(route.params.id as string, item.value);
  } else {
    return api.value.create(item.value);
  }
}, {
  success: () => isExistingItem.value ? 'Successfully updated' : 'Successfully created',
  error: () => isExistingItem.value ? 'Failed to update' : 'Failed to create'
})

if (isExistingItem.value) {
  watch(api, () => {
    api.value.getOne(route.params.id as string).then(data => item.value = data)
  }, {immediate: true})
}

function capitalize(str = '') {
  return str[0].toUpperCase() + str.substring(1, str.length);
}
</script>

<style scoped>
.row {
  padding: var(--spacing);
}
</style>