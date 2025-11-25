<script setup lang="ts">
import { computed, getCurrentInstance, inject, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComputedRef } from 'vue';
import EditComponentBar from '@/modules/no-code/components/EditComponentBar.vue';
import type { DragPosition, EditableManager } from '@/modules/no-code/compositions/edit-mfe-structure';

const editableManagerRef = inject<ComputedRef<EditableManager | false> | null>('editableManager', null);
const show = ref(false);
const runIdle = typeof window['requestIdleCallback'] === 'function' ? requestIdleCallback : setTimeout;
const rootRef = ref<HTMLElement | null>(null);
const qlId = ref<string | null>(null);
const dragHoverPosition = ref<DragPosition | null>(null);
let observer: MutationObserver | null = null;

const editableManager = computed<EditableManager | null>(() => {
  const value = editableManagerRef?.value;
  if (value === false || value == null) {
    return null;
  }
  return value;
});

const isDraggable = computed(() => Boolean(editableManager.value && qlId.value));
const isDraggingSelf = computed(() => editableManager.value?.draggingQlId.value === qlId.value);

function updateQlId() {
  const host = rootRef.value;
  if (!host) {
    qlId.value = null;
    return;
  }
  const hostId = host.getAttribute('data-ql-id');
  if (hostId) {
    qlId.value = hostId;
    return;
  }
  const descendant = host.querySelector('[data-ql-id]') as HTMLElement | null;
  qlId.value = descendant?.getAttribute('data-ql-id') || null;
}

onMounted(async () => {
  await nextTick();
  updateQlId();
  if (editableManager.value) {
    runIdle(() => show.value = true);
  }
  if (rootRef.value) {
    observer = new MutationObserver(() => updateQlId());
    observer.observe(rootRef.value, { childList: true, subtree: true, attributes: true });
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

watch(() => editableManager.value, (value) => {
  if (!value) {
    show.value = false;
    dragHoverPosition.value = null;
    return;
  }
  runIdle(() => show.value = true);
});

function clearDragState() {
  dragHoverPosition.value = null;
}

function handleDragStart(event: DragEvent) {
  if (!isDraggable.value || !qlId.value) {
    event.preventDefault();
    return;
  }
  event.dataTransfer?.setData('text/plain', qlId.value);
  editableManager.value?.setDraggingQlId(qlId.value);
}

function handleDragEnd() {
  editableManager.value?.setDraggingQlId(null);
  clearDragState();
}

function handleDragOver(event: DragEvent) {
  const manager = editableManager.value;
  if (!manager || !manager.draggingQlId.value || manager.draggingQlId.value === qlId.value) {
    return;
  }
  event.preventDefault();
  const bounds = rootRef.value?.getBoundingClientRect();
  if (!bounds) {
    return;
  }
  const midpoint = bounds.top + bounds.height / 2;
  dragHoverPosition.value = event.clientY < midpoint ? 'before' : 'after';
}

function handleDrop(event: DragEvent) {
  const manager = editableManager.value;
  const draggedQlId = manager?.draggingQlId.value;
  if (!manager || !draggedQlId || !qlId.value || draggedQlId === qlId.value || !dragHoverPosition.value) {
    clearDragState();
    return;
  }
  event.preventDefault();
  const dropPosition = dragHoverPosition.value;
  clearDragState();
  manager.reorderComponents(draggedQlId, qlId.value, dropPosition).finally(() => {
    manager.setDraggingQlId(null);
  });
}

function handleDragLeave(event: DragEvent) {
  if (!rootRef.value || rootRef.value.contains(event.relatedTarget as Node)) {
    return;
  }
  clearDragState();
}

const emptyElements = computed(() => {
  const host = rootRef.value;
  if (!host) {
    return false;
  }
  const meaningfulChild = Array.from(host.children).find((child) => child !== host.querySelector('.edit-component-bar'));
  return !meaningfulChild;
});

const vm = getCurrentInstance();

const slottedComponent = computed(() => {
  const componentName = rootRef.value?.getAttribute('data-ql-component')
  if (!componentName) {
    return {
      name: '',
      attributes: ''
    };
  }
  const slotElement = Array.from(vm?.slots.default?.() || [])[0];
  const slotHtml = (slotElement as any)?.ctx?.type.template;
  const template = document.createElement('template');
  template.innerHTML = slotHtml;
  const slotElementAttributes = template.content.querySelector('*')

  return {
    name: componentName,
    attributes: slotElementAttributes?.getAttributeNames().filter((attr) => !attr.startsWith('data-ql')).map((attr) => `${attr}: "${slotElementAttributes.getAttribute(attr)}"`).join(', ')
  }
});

</script>

<template>
  <div
    ref="rootRef"
    class="editable-content"
    :draggable="isDraggable"
    :data-drop-position="dragHoverPosition"
    :data-dragging="isDraggingSelf"
    @dragstart.stop="handleDragStart"
    @dragend="handleDragEnd"
    @dragover.prevent="handleDragOver"
    @drop.stop.prevent="handleDrop"
    @dragleave="handleDragLeave"
    :class="{ 'empty-slot': emptyElements }"
  >
    <EditComponentBar v-if="show" />
    <slot />
    <div v-if="emptyElements" class="empty-slot-placeholder">
      <h3>{{ slottedComponent.name }}</h3>
      <p v-if="slottedComponent.attributes">[ {{ slottedComponent.attributes }} ]</p>
    </div>
  </div>
</template>

<style scoped>
.editable-content {
  position: relative;
  min-height: 10px;
}

.editable-content[data-dragging='true'] {
  opacity: 0.5;
}

.editable-content.empty-slot {
  min-height: 40px;
}

.empty-slot-placeholder {
  text-align: center;
  font-size: 16px;
}

.empty-slot-placeholder h3 {
  font-weight: 600;
}

.empty-slot-placeholder p {
  margin: 0;
  text-align: center;
  font-size: 14px;
}

.editable-content .empty-slot-placeholder {
  width: 100%;
  height: 100%;
  text-align: center;
}

.editable-content::before {
  content: '';
  position: absolute;
  inset-inline-start: 0;
  inset-inline-end: 0;
  height: 2px;
  background: transparent;
  pointer-events: none;
}

.editable-content[data-drop-position='before']::before {
  background: var(--el-color-primary);
  inset-block-start: -4px;
}

.editable-content[data-drop-position='after']::before {
  background: var(--el-color-primary);
  inset-block-end: -4px;
}
</style>