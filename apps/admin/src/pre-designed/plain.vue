<template>
  <EditPageStructure v-if="isEditingEnabled && updateCode"
                     :page-name="pageName"
                     :mfe="editedPluginMfe"
                     :submitting="submitting"
                     @save="saveCodeEditor"
                     @close="closeCodeEditor"/>
  <main v-else>
    <el-button-group v-if="isEditingEnabled" class="edit-bar">
      <el-button @click="clonePage">
        <el-icon class="edit-bar-icon">
          <font-awesome-icon :icon="['far', 'clone']"/>
        </el-icon>
        {{ $t('Clone') }}
      </el-button>
      <el-button @click="openAddComponentModal()">
        <el-icon>
          <font-awesome-icon :icon="['fas', 'layer-group']" />
        </el-icon>
        <span>{{ $t('Wizard') }}</span>
      </el-button>
      <el-button @click="openCodeEditor()">
        <el-icon>
          <font-awesome-icon :icon="['fas', 'code']" />
        </el-icon>
        <span>{{ $t('Code') }}</span>
      </el-button>
      <el-button type="danger" @click="removePage">
        <el-icon class="edit-bar-icon">
          <font-awesome-icon :icon="['fas', 'trash']"/>
        </el-icon>
        {{ $t('Remove') }}
      </el-button>
    </el-button-group>
    <ErrorBoundary>
      <div class="template-content">
        <VRuntimeTemplate v-if="item"
                          :template="relevantStructure"
                          :template-props="templateProps"/>
      </div>
    </ErrorBoundary>
    <AddComponentModal v-if="addComponent" @save="submitComponentToTemplate" @close="addComponent = undefined"/>
  </main>
</template>

<script lang="ts" setup>
import { computed, ref, toRef, toRefs, watch } from 'vue';
import { usePluginsMicroFrontends } from '@/modules/plugins/store/plugins-microfrontends';
import VRuntimeTemplate from 'vue3-runtime-template';
import { useSingleItemCrud } from '@/modules/pre-designed/compositions/single-item-crud';
import { useDynamicRouteItem } from '@/modules/pre-designed/compositions/dynamic-route-item';
import { useScreenRequirementsStore } from '@/modules/pre-designed/compositions/screen-requirements';
import { useAuth } from '@/modules/core/compositions/authentication';
import { isEditingEnabled } from '@/modules/core/store/auth';
import AddComponentModal from '@/pre-designed/editor/AddComponentModal.vue';
import { useEditMfeStructure } from '@/modules/no-code/compositions/edit-mfe-structure';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import EditPageStructure from '@/pre-designed/editor/EditPageStructure.vue';
import sdk from '@/services/sdk';
import ErrorBoundary from '@/modules/core/components/layout/ErrorBoundary.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
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
  submitCodeToTemplate,
  clonePage,
  removePage,
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

const { submit: saveCodeEditor, submitting } = useSubmitting(async ({ structure, requirements, settings }) => {
  await submitCodeToTemplate(structure, requirements, settings)
  updateCode.value = true;
})

watch(() => route.fullPath, () => {
  if (updateCode.value) {
    openCodeEditor();
  }
})

const templateProps = computed(() => {
  return {
    ...requirements.value,
    row: item.value,
    schema: crud.value.schema,
    cruds: cruds.value,
    user: user.value,
    sdk
  };
})
</script>

<style scoped>
main {
  position: relative;
}

.edit-bar {
  position: fixed;
  z-index: 4;
  top: 70px;
  right: 40px;
}

.edit-bar-icon {
  margin-inline-end: 10px;
}
</style>