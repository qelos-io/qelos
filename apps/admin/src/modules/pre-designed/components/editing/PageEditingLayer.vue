<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Edit } from '@element-plus/icons-vue';
import { isEditingEnabled } from '@/modules/core/store/auth';
import { useEditMfeStructure, type EditableManager } from '@/modules/no-code/compositions/edit-mfe-structure';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import CodeEditorPanel from './CodeEditorPanel.vue';
import EditorTour from '@/pre-designed/editor/EditorTour.vue';
import { clearEditingState, clearPreview, editingState } from '../../compositions/page-editing';
import type { BuiltComponent } from '../../services/build-component';
import ComponentPanel from './ComponentPanel.vue';
import BlockOverlay from './BlockOverlay.vue';
import EditBar from './EditBar.vue';
import StructurePanel from './StructurePanel.vue';

defineProps<{
  /** the markup the page shows now (a draft while one is being designed) */
  structure: string;
  /** the markup as saved */
  savedStructure: string;
  extraTags: string[];
}>();

/** the code editor is open: the page itself is not shown */
const codeOpen = defineModel<boolean>('codeOpen', { default: false });

const route = useRoute();
const router = useRouter();

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
  finishEditComponent,
  removeComponent,
  editComponent,
  reorderComponents,
  moveComponent,
} = useEditMfeStructure();

const draggingQlId = ref<string | null>(null);
const manager = computed<EditableManager>(() => ({
  removeComponent: removeComponent as EditableManager['removeComponent'],
  editComponent,
  addComponentBefore: (qlId) => (addComponentOptions.value = { beforeQlId: qlId }),
  addComponentAfter: (qlId) => (addComponentOptions.value = { afterQlId: qlId }),
  reorderComponents,
  moveComponent,
  setDraggingQlId: (qlId) => (draggingQlId.value = qlId),
  draggingQlId,
}));

async function openCode() {
  await fetchMfe();
  editedPluginMfe.value!.structure ||= '';
  editedPluginMfe.value!.requirements ||= [];
  codeOpen.value = true;
}

const { submit: saveCode, submitting } = useSubmitting(async ({ structure, requirements, settings }) => {
  await submitCodeToTemplate(structure, requirements, settings);
});

watch(
  () => route.fullPath,
  () => {
    if (codeOpen.value) openCode();
  },
);

const showTools = computed(() => isEditingEnabled.value && !codeOpen.value);

function done() {
  isEditingEnabled.value = false;
  editingState.structureOpen = false;
  clearEditingState();
}

function openSettings() {
  const pluginId = (route.meta.mfe as { pluginId?: string } | undefined)?.pluginId;
  if (pluginId) router.push({ name: 'editPlugin', params: { pluginId }, query: { section: 'ui' } });
}

const handleClone = () => (clonePage as (p?: unknown) => Promise<void>)();
const handleRemove = () => (removePage as (p?: unknown) => Promise<void>)();

const panelOpen = computed(() => !!addComponentOptions.value || !!editedComponentContext.value?.editChild);

async function onAdd(built: BuiltComponent) {
  await submitComponentToTemplate(built);
  addComponentOptions.value = undefined;
  clearPreview();
}

async function onEdit(element: HTMLElement) {
  await finishEditComponent(element);
  editedComponentContext.value = undefined;
  clearPreview();
}

function closePanel() {
  addComponentOptions.value = undefined;
  editedComponentContext.value = undefined;
}

const PANEL_WIDTH = 480;
const STRUCTURE_WIDTH = 320;
watch(
  () => [panelOpen.value, editingState.structureOpen, showTools.value] as const,
  ([panel, structure, tools]) => {
    if (codeOpen.value) return; // the code editor sets its own width
    editingState.reserve = !tools ? 0 : panel ? PANEL_WIDTH : structure ? STRUCTURE_WIDTH : 0;
  },
  { immediate: true },
);

defineExpose({ openCode });
</script>

<template>
  <CodeEditorPanel v-if="isEditingEnabled && codeOpen && editedPluginMfe" :page-name="pageName" :mfe="editedPluginMfe" :submitting="submitting" @save="saveCode" @close="codeOpen = false" />

  <template v-if="showTools">
    <EditBar :page-name="pageName" :structure-open="editingState.structureOpen" @add="addComponentOptions = {}" @code="openCode" @structure="editingState.structureOpen = !editingState.structureOpen" @settings="openSettings" @clone="handleClone" @remove="handleRemove" @done="done" />
    <BlockOverlay :manager="manager" :structure="structure" :extra-tags="extraTags" />
    <StructurePanel v-if="editingState.structureOpen" :structure="structure" :extra-tags="extraTags" :manager="manager" @close="editingState.structureOpen = false" />
    <ComponentPanel v-if="panelOpen" :key="addComponentOptions ? 'add' : editedComponentContext?.qlId" :saved-structure="savedStructure" :anchor="addComponentOptions" :edit="editedComponentContext?.editChild ? editedComponentContext : undefined" @add="onAdd" @edit="onEdit" @close="closePanel" />
  </template>

  <el-tooltip v-if="!isEditingEnabled && !codeOpen" :content="$t('Edit this page')" placement="left">
    <button id="edit-mode-toggle" type="button" class="enter-edit" :aria-label="$t('Edit this page')" @click="isEditingEnabled = true"><el-icon><Edit /></el-icon></button>
  </el-tooltip>
  <EditorTour />
</template>

<style scoped lang="scss">
.enter-edit {
  position: fixed;
  inset-block-end: 20px;
  inset-inline-end: 20px;
  z-index: 1000;
  display: grid;
  place-items: center;
  inline-size: 44px;
  block-size: 44px;
  border: 0;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 18px;
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.2);
  cursor: pointer;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.06);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary-light-5);
    outline-offset: 3px;
  }
}

@media (max-width: 720px) {
  .enter-edit {
    inset-block-end: 72px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .enter-edit {
    transition: none;
  }
}
</style>

<style lang="scss">
/* keep a block that is scrolled into view clear of the app header and the edit bar */
html[editing-enabled] [data-ql-tag] {
  scroll-margin-block: 90px 80px;
}
</style>
