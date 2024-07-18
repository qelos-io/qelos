<template>
  <EditPageStructure v-if="isEditingEnabled && updateCode"
                     :page-name="pageName"
                     :mfe="editedPluginMfe"
                     @save="saveCodeEditor"
                     @close="closeCodeEditor"/>
  <main v-else>
    <VRuntimeTemplate v-if="item"
                      :template="relevantStructure"
                      :template-props="{...requirements, row: item, schema: crud.schema, cruds, user}"/>
    <EditButtons v-if="isEditingEnabled" @wizard="openAddComponentModal" @code="openCodeEditor"/>
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
import AddComponentModal from '@/pre-designed/editor/AddComponentModal.vue';
import { useEditMfeStructure } from '@/modules/no-code/compositions/edit-mfe-structure';
import EditButtons from '@/pre-designed/editor/EditButtons.vue';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import EditPageStructure from '@/pre-designed/editor/EditPageStructure.vue';

const mfes = usePluginsMicroFrontends();
const item = ref();

const cruds = toRef(mfes, 'cruds')

const { user } = useAuth()

const { api, crud, relevantStructure } = useSingleItemCrud()
const { requirements } = toRefs(useScreenRequirementsStore())
useDynamicRouteItem(api, item);

function openAddComponentModal(el?: HTMLElement) {
  addComponent.value = {
    afterEl: el,
  }
}

const {
  addComponent,
  submitComponentToTemplate,
  pageName,
  fetchMfe,
  editedPluginMfe,
  submitCodeToTemplate
} = useEditMfeStructure()
const updateCode = ref(false)


async function openCodeEditor() {
  await fetchMfe()
  editedPluginMfe.value.structure ||= '';
  editedPluginMfe.value.requirements ||= []
  updateCode.value = true;
}

function closeCodeEditor() {
  updateCode.value = false;
}

const { submit: saveCodeEditor, submitting } = useSubmitting(async ({ structure, requirements }) => {
  await submitCodeToTemplate(structure, requirements)
  updateCode.value = true;
})
provide('submitting', submitting)
</script>