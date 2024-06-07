<template>
  <main>
    <el-form @submit.prevent="submit">
      <VRuntimeTemplate v-if="item" :template="relevantStructure" :template-props="{row: item, schema: crud.schema}"/>
    </el-form>
  </main>
</template>

<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router';
import { computed, provide, ref, watch } from 'vue';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import VRuntimeTemplate from 'vue3-runtime-template';
import { useNotifications } from '@/modules/core/compositions/notifications';

const route = useRoute();
const router = useRouter();
const mfes = usePluginsMicroFrontends();
const { error } = useNotifications()

const crud = computed(() => {
  const crud = route.meta.crud as any || { display: {} };
  return {
    ...crud,
    display: {
      name: 'item',
      capitalizedPlural: 'Items',
      ...(crud.display || {}),
    },
    screen: {
      structure: (route.meta.mfe as any)?.structure
    }
  }
});
const api = computed(() => mfes.cruds[crud.value.name].api);
const identifierKey = computed(() => mfes.cruds[crud.value.name].identifierKey || '_id');
const isExistingItem = computed(() => !!route.params.id);
const relevantStructure = computed(() => {
  return (route.meta.mfe as any)?.structure;
});
const item = ref();

function renderParams(obj, params) {
  return Object.keys(obj).reduce((result, key) => {
    // replace any {key} in obj[key] with the value of params[key]
    result[key] = obj[key].replace(/{(\w+)}/g, (match, p1) => {
      return params[p1];
    });
    return result;
  }, {})
}

function handleAfterSubmit(updatedItem) {
  if (crud.value.navigateAfterSubmit) {
    const navigateTo = crud.value.navigateAfterSubmit;
    const templateParams = { ...updatedItem, IDENTIFIER: createdItem[identifierKey.value] }
    await router.push({
      name: navigateTo.name,
      params: renderParams(navigateTo.params, templateParams),
      query: renderParams(navigateTo.query, templateParams)
    })
  } else if (crud.value.clearAfterSubmit) {
    item.value = {}
  }
}

const { submit, submitting } = useSubmitting(async () => {
  if (isExistingItem.value) {
    const updatedItem = await api.value.update(route.params.id as string, item.value);
    handleAfterSubmit(updatedItem);
    return updatedItem;
  } else {
    const createdItem = await api.value.create(item.value);
    handleAfterSubmit(createdItem);
    return createdItem;
  }
}, {
  success: () => isExistingItem.value ? 'Successfully updated' : 'Successfully created',
  error: () => isExistingItem.value ? 'Failed to update' : 'Failed to create'
})

provide('submitting', submitting)

if (isExistingItem.value) {
  watch(api, () => {
    if (!route.params.id) {
      return;
    }
    api.value.getOne(route.params.id as string)
        .then(data => item.value = data)
        .catch(() => error('Failed to load page data'))
  }, { immediate: true })
} else {
  item.value = {};
}
</script>