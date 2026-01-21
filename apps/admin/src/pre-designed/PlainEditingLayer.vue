<template>
  <EditPageStructure
    v-if="showCodeEditor && editedPluginMfe"
    :page-name="pageName"
    :mfe="editedPluginMfe"
    :submitting="submitting"
    @save="saveCodeEditor"
    @close="closeCodeEditor"
  />
  <div v-else class="edit-bar-container" :class="{ collapsed: isEditingEnabled }">
    <div
      class="edit-mode-indicator"
      @click="onToggleEdit"
      @keydown.enter="onToggleEdit"
      tabindex="0"
      role="button"
      aria-label="Toggle editor tools"
    >
      <el-icon>
        <font-awesome-icon :icon="isEditingEnabled ? ['fas', 'chevron-right'] : ['fas', 'pencil-alt']" />
      </el-icon>
    </div>

    <transition name="slide-fade">
      <div v-show="isEditingEnabled" class="edit-bar">
        <el-button-group class="edit-group">
          <el-tooltip :content="$t('Add components with wizard')" placement="top" effect="light">
            <el-button type="primary" @click="onAddComponentClick" id="no-code-wizard-btn" class="feature-btn">
              <el-icon>
                <font-awesome-icon :icon="['fas', 'layer-group']" />
              </el-icon>
              <span>{{ $t('Wizard') }}</span>
            </el-button>
          </el-tooltip>
          <el-tooltip :content="$t('Edit page code')" placement="top" effect="light">
            <el-button type="primary" @click="onOpenCodeEditor" id="no-code-code-btn" class="feature-btn">
              <el-icon>
                <font-awesome-icon :icon="['fas', 'code']" />
              </el-icon>
              <span>{{ $t('Advanced') }}</span>
            </el-button>
          </el-tooltip>
        </el-button-group>

        <div class="action-buttons">
          <el-tooltip :content="$t('Clone this page')" placement="top" effect="light">
            <el-button @click="onClonePage" class="action-btn" size="small">
              <el-icon>
                <font-awesome-icon :icon="['far', 'clone']" />
              </el-icon>
              <span class="hide-on-small">{{ $t('Clone') }}</span>
            </el-button>
          </el-tooltip>

          <el-tooltip :content="$t('Remove this page')" placement="top" effect="light">
            <el-button type="danger" class="action-btn" size="small" @click="onRemovePage">
              <el-icon>
                <font-awesome-icon :icon="['fas', 'trash']" />
              </el-icon>
              <span class="hide-on-small">{{ $t('Remove') }}</span>
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue';
import { IMicroFrontend } from '@/services/types/plugin';
import EditPageStructure from '@/pre-designed/editor/EditPageStructure.vue';

const props = defineProps<{
  pageName: string;
  editedPluginMfe?: IMicroFrontend;
  submitting: boolean;
  showCodeEditor: boolean;
  isEditingEnabled: boolean;
  toggleEdit: () => void;
  openAddComponentModal: (el?: HTMLElement) => void;
  openCodeEditor: () => void | Promise<void>;
  clonePage: () => void | Promise<void>;
  removePage: () => void | Promise<void>;
  saveCodeEditor: (payload: { structure: string; requirements: any[]; settings: Partial<IMicroFrontend> }) => void | Promise<void>;
  closeCodeEditor: () => void;
}>();

const {
  pageName,
  editedPluginMfe,
  submitting,
  showCodeEditor,
  isEditingEnabled,
  toggleEdit,
  openAddComponentModal,
  openCodeEditor,
  clonePage,
  removePage,
  saveCodeEditor,
  closeCodeEditor,
} = toRefs(props);

const onToggleEdit = () => toggleEdit.value();
const onAddComponentClick = () => openAddComponentModal.value?.();
const onOpenCodeEditor = () => openCodeEditor.value?.();
const onClonePage = () => clonePage.value?.();
const onRemovePage = () => removePage.value?.();
</script>

<style scoped>
.edit-bar-container {
  position: fixed;
  z-index: 999;
  bottom: 10px;
  inset-inline-start: 250px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

@media (max-width: 768px) {
  .edit-bar-container {
    inset-inline-start: 0;
    bottom: 0;
  }
}

.edit-bar-container.collapsed {
  inset-inline-end: 20px;
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
  margin-inline-end: 8px;
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

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

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
    margin-inline-start: 0;
    margin-bottom: 6px;
  }

  .action-buttons {
    gap: 6px;
  }
}

@media (prefers-color-scheme: dark) {
  .edit-bar {
    background-color: rgba(30, 30, 30, 0.85);
    border-color: var(--el-border-color-darker, #636363);
  }
}
</style>
