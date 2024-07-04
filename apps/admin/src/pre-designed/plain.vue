<template>
  <main>
    <VRuntimeTemplate v-if="item" :template="relevantStructure"
                      :template-props="{row: item, schema: crud.schema, cruds, requirements}"/>
  </main>
</template>

<script lang="ts" setup>
import { ref, toRef, toRefs } from 'vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import VRuntimeTemplate from 'vue3-runtime-template';
import { useSingleItemCrud } from '@/modules/pre-designed/compositions/single-item-crud';
import { useDynamicRouteItem } from '@/modules/pre-designed/compositions/dynamic-route-item';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';

const mfes = usePluginsMicroFrontends();
const item = ref();

const cruds = toRef(mfes, 'cruds')

const { api, crud, relevantStructure } = useSingleItemCrud()
useDynamicRouteItem(api, item);

const { requirements } = toRefs(useScreenRequirementsStore())
</script>