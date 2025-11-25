<template>
  <main v-if="!isEditingEnabled || !updateCode">
    <ErrorBoundary v-if="isRequirementsLoaded" @error="reRenderAfterError" :key="$route.fullPath + updates">
      <div class="template-content">
        <VRuntimeTemplate v-if="item"
                          :template="relevantStructure"
                          :template-props="templateProps"/>
      </div>
    </ErrorBoundary>
    <AddComponentModal v-if="addComponentOptions" @save="submitComponentToTemplate" @close="addComponentOptions = undefined"/>
    <EditComponentModal v-if="editedComponentContext?.editChild" v-model="editedComponentContext.editChild"
                        @save="finishEditComponent"/>
  </main>
  <PlainEditingLayer
    v-if="isPrivilegedUser"
    :is-editing-enabled="isEditingEnabled"
    :show-code-editor="isEditingEnabled && updateCode"
    :page-name="pageName"
    :edited-plugin-mfe="editedPluginMfe"
    :submitting="submitting"
    :toggle-edit="toggleEditing"
    :open-add-component-modal="handleOpenAddComponent"
    :open-code-editor="handleOpenCodeEditor"
    :clone-page="handleClonePage"
    :remove-page="handleRemovePage"
    :save-code-editor="saveCodeEditor"
    :close-code-editor="closeCodeEditor"
  />
  <EditorTour v-if="isPrivilegedUser"/>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, toRef, toRefs, watch } from 'vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import VRuntimeTemplate from 'vue3-runtime-template';
import { useSingleItemCrud } from '@/modules/pre-designed/compositions/single-item-crud';
import { useDynamicRouteItem } from '@/modules/pre-designed/compositions/dynamic-route-item';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';
import { useAuth } from '@/modules/core/compositions/authentication';
import { fetchAuthUser, isEditingEnabled, isPrivilegedUser } from '@/modules/core/store/auth';
import AddComponentModal from '@/pre-designed/editor/AddComponentModal.vue';
import { useEditMfeStructure } from '@/modules/no-code/compositions/edit-mfe-structure';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import sdk from '@/services/sdk';
import ErrorBoundary from '@/modules/core/components/layout/ErrorBoundary.vue';
import { useRoute } from 'vue-router';
import { useGlobalStyles } from '@/modules/pre-designed/compositions/global-styles';
import EditComponentModal from '@/pre-designed/editor/EditComponentModal.vue';
import EditorTour from '@/pre-designed/editor/EditorTour.vue';
import PlainEditingLayer from '@/pre-designed/PlainEditingLayer.vue';
import { usePluginsStore } from '@/modules/plugins/store/pluginsStore';
const pluginsStore = usePluginsStore(); 
const route = useRoute();
const mfes = usePluginsMicroFrontends();
const item = ref();
const cruds = toRef(mfes, 'cruds')

const updates = ref(0)

async function reRenderAfterError() {
  if (updates.value > 5) {
    return;
  }
  await nextTick();
  updates.value++;
}

function toggleEditing() {
  isEditingEnabled.value = !isEditingEnabled.value;
}

fetchAuthUser(false, true);
const { user, isLoaded: userLoaded, userPromise } = useAuth()

watch(() => pluginsStore.componentUpdates, () => {
  updates.value++;
});

const { api, crud, relevantStructure, styles } = useSingleItemCrud()
const { requirements, isRequirementsLoaded } = toRefs(useScreenRequirementsStore())
useDynamicRouteItem(api, item);
useGlobalStyles(styles);

function openAddComponentModal(el?: HTMLElement) {
  addComponentOptions.value = {
    afterEl: el,
  }
}

const {
  addComponentOptions,
  submitComponentToTemplate,
  pageName,
  fetchMfe,
  editedPluginMfe,
  submitCodeToTemplate,
  clonePage,
  removePage,
  editedComponentContext,
  finishEditComponent
} = useEditMfeStructure()
const updateCode = ref(false)

const handleOpenAddComponent = () => openAddComponentModal()
const handleOpenCodeEditor = () => openCodeEditor()
const handleClonePage = () => (clonePage as (payload?: any) => Promise<void> | void)()
const handleRemovePage = () => (removePage as (payload?: any) => Promise<void> | void)()

async function openCodeEditor() {
  await fetchMfe()
  editedPluginMfe.value.structure ||= '';
  editedPluginMfe.value.requirements ||= []
  updateCode.value = true;
}

function closeCodeEditor() {
  updateCode.value = false;
}

const { submit: saveCodeEditor, submitting } = useSubmitting(async ({ structure, requirements, settings }) => {
  await submitCodeToTemplate(structure, requirements, settings)
  updateCode.value = true;
})

watch(() => route.fullPath, () => {
  if (updateCode.value) {
    openCodeEditor();
  }
})

watch(relevantStructure, () => {
  updates.value++;
})

const templateProps = computed(() => {
  return {
    ...requirements.value,
    row: item.value,
    schema: crud.value.schema,
    cruds: cruds.value,
    user: user.value,
    userLoaded,
    userPromise,
    sdk,
    location,
  };
});

if (isPrivilegedUser.value && !isEditingEnabled.value && relevantStructure.value === '<div></div>') {
  isEditingEnabled.value = true;
}
</script>

<style scoped>
main {
  position: relative;
}
</style>
