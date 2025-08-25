<template>
  <EditPageStructure v-if="isEditingEnabled && updateCode"
                     :page-name="pageName"
                     :mfe="editedPluginMfe"
                     :submitting="submitting"
                     @save="saveCodeEditor"
                     @close="closeCodeEditor"/>
  <main v-else>
    <div v-if="isPrivilegedUser" class="edit-bar-container" :class="{ 'collapsed': isEditingEnabled }">
      <div class="edit-mode-indicator" @click="toggleEditBar" tabindex="0" role="button" aria-label="Toggle editor tools" @keydown.enter="toggleEditBar">
        <el-icon v-if="isEditingEnabled"><font-awesome-icon :icon="['fas', 'chevron-right']"/></el-icon>
        <el-icon v-else><font-awesome-icon :icon="['fas', 'pencil-alt']"/></el-icon>
      </div>
      
      <transition name="slide-fade">
        <div v-show="isEditingEnabled" class="edit-bar">
          <!-- Create group -->
          <el-button-group class="edit-group">
            <el-tooltip :content="$t('Add components with wizard')" placement="top" effect="light">
              <el-button type="primary" @click="openAddComponentModal()" id="no-code-wizard-btn" class="feature-btn">
                <el-icon>
                  <font-awesome-icon :icon="['fas', 'layer-group']"/>
                </el-icon>
                <span>{{ $t('Wizard') }}</span>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('Edit page code')" placement="top" effect="light">
              <el-button type="primary" @click="openCodeEditor()" id="no-code-code-btn" class="feature-btn">
                <el-icon>
                  <font-awesome-icon :icon="['fas', 'code']"/>
                </el-icon>
                <span>{{ $t('Code') }}</span>
              </el-button>
            </el-tooltip>
          </el-button-group>
          
          <div class="action-buttons">
            <!-- Clone button -->
            <el-tooltip :content="$t('Clone this page')" placement="top" effect="light">
              <el-button @click="clonePage" class="action-btn" size="small">
                <el-icon>
                  <font-awesome-icon :icon="['far', 'clone']"/>
                </el-icon>
                <span class="hide-on-small">{{ $t('Clone') }}</span>
              </el-button>
            </el-tooltip>
            
            <!-- Remove button -->
            <el-tooltip :content="$t('Remove this page')" placement="top" effect="light">
              <el-button type="danger" class="action-btn" size="small" @click="removePage">
                <el-icon>
                  <font-awesome-icon :icon="['fas', 'trash']"/>
                </el-icon>
                <span class="hide-on-small">{{ $t('Remove') }}</span>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </transition>
    </div>
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
import EditPageStructure from '@/pre-designed/editor/EditPageStructure.vue';
import sdk from '@/services/sdk';
import ErrorBoundary from '@/modules/core/components/layout/ErrorBoundary.vue';
import { useRoute } from 'vue-router';
import { useGlobalStyles } from '@/modules/pre-designed/compositions/global-styles';
import EditComponentModal from '@/pre-designed/editor/EditComponentModal.vue';
import EditorTour from '@/pre-designed/editor/EditorTour.vue';
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

function toggleEditBar() {
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

.edit-bar-container {
  position: fixed;
  z-index: 999;
  bottom: 10px;
  left: 250px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

@media (max-width: 768px) {
  .edit-bar-container {
    left: 0;
    bottom: 0;
    width: 100%;
  }
}

.edit-bar-container.collapsed {
  right: 20px;
}

.edit-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  background-color: var(--el-bg-color, #ffffff);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.edit-mode-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: var(--el-color-primary, #409EFF);
  color: white;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.edit-mode-indicator:hover {
  transform: scale(1.1);
  background-color: var(--el-color-primary-dark-2, #337ecc);
}

.edit-mode-indicator:focus {
  outline: 2px solid var(--el-color-primary-light-3, #79bbff);
  outline-offset: 2px;
}

.edit-group {
  margin-right: 8px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.feature-btn {
  position: relative;
}

/* Keyboard shortcuts removed */

/* Animations */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

/* Responsive styles */
@media (max-width: 768px) {
  .hide-on-small {
    display: none;
  }
  
  .edit-bar {
    padding: 6px;
    gap: 6px;
    flex-direction: column;
    align-items: flex-end;
  }
  
  .edit-group {
    margin-right: 0;
    margin-bottom: 6px;
  }
  
  .action-buttons {
    gap: 6px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .edit-bar {
    background-color: rgba(30, 30, 30, 0.85);
    border-color: var(--el-border-color-darker, #636363);
  }
}
</style>
