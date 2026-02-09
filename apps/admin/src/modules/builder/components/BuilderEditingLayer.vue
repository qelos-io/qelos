<template>
  <EditPageStructure
    v-if="showCodeEditor && editedPluginMfe"
    :page-name="pageName"
    :mfe="editedPluginMfe"
    :submitting="submitting"
    @save="saveCodeEditor"
    @close="closeCodeEditor"
  />
</template>

<script setup lang="ts">
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
} = props;

const saveCodeEditor = (payload: { structure: string; requirements: any[]; settings: Partial<IMicroFrontend> }) => {
  props.saveCodeEditor(payload);
};

const closeCodeEditor = () => {
  props.closeCodeEditor();
};
</script>
