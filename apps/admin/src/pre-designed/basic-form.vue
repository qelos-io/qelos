<template>
  <main>
    <el-form @submit.prevent="submit">
      <VRuntimeTemplate v-if="item" :template="relevantStructure"
                        :template-props="{row: item, schema: crud.schema, cruds, requirements}"/>
    </el-form>
  </main>
</template>

<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router';
import { computed, provide, ref, toRef, toRefs, watch } from 'vue';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import VRuntimeTemplate from 'vue3-runtime-template';
import { useNotifications } from '@/modules/core/compositions/notifications';
import { useSingleItemCrud } from '@/modules/pre-designed/compositions/single-item-crud';
import { useDynamicRouteItem } from '@/modules/pre-designed/compositions/dynamic-route-item';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';

const route = useRoute();
const router = useRouter();
const mfes = usePluginsMicroFrontends();
const { error } = useNotifications()

const cruds = toRef(mfes, 'cruds')
const { api, crud, relevantStructure } = useSingleItemCrud()

const identifierKey = computed(() => mfes.cruds[crud.value.name].identifierKey || '_id');
const isExistingItem = computed(() => !!route.params.id);
const item = ref();

useDynamicRouteItem(api, item);

function renderParams(obj, params) {
  return Object.keys(obj).reduce((result, key) => {
    // replace any {key} in obj[key] with the value of params[key]
    result[key] = obj[key].replace(/{(\w+)}/g, (match, p1) => {
      return params[p1];
    });
    return result;
  }, {})
}

async function handleAfterSubmit(updatedItem) {
  if (crud.value.navigateAfterSubmit) {
    const navigateTo = crud.value.navigateAfterSubmit;
    const templateParams = { ...updatedItem, IDENTIFIER: createdItem[identifierKey.value] }
    await router.push({
      name: navigateTo.name,
      params: renderParams(navigateTo.params || {}, templateParams),
      query: renderParams(navigateTo.query || {}, templateParams)
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
const { requirements } = toRefs(useScreenRequirementsStore())
</script>