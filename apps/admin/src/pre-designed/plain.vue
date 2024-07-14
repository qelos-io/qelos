<template>
  <main>
    <VRuntimeTemplate v-if="item" :template="relevantStructure"
                      :template-props="{row: item, schema: crud.schema, cruds, requirements, user}"/>
    <AddMore v-if="isEditingEnabled" @click="openAddComponentModal"/>

    <AddComponentModal v-if="addComponent" @save="submitComponentToTemplate" @close="addComponent = undefined"/>
  </main>
</template>

<script lang="ts" setup>
import { provide, ref, toRef, toRefs } from 'vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import VRuntimeTemplate from 'vue3-runtime-template';
import { useSingleItemCrud } from '@/modules/pre-designed/compositions/single-item-crud';
import { useDynamicRouteItem } from '@/modules/pre-designed/compositions/dynamic-route-item';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';
import { useAuth } from '@/modules/core/compositions/authentication';
import { isEditingEnabled } from '@/modules/core/store/auth';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import AddComponentModal from '@/pre-designed/editor/AddComponentModal.vue';

const mfes = usePluginsMicroFrontends();
const item = ref();

const cruds = toRef(mfes, 'cruds')

const { user } = useAuth()

const { api, crud, relevantStructure } = useSingleItemCrud()
useDynamicRouteItem(api, item);

const addComponent = ref()
function openAddComponentModal(el?: HTMLElement) {
  addComponent.value = {
    afterEl: el,
  }
}
function submitComponentToTemplate(data) {
  console.log(data)
}

const { requirements } = toRefs(useScreenRequirementsStore())
provide('isEditable', isEditingEnabled);
</script>