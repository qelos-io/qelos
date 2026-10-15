<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ArrowDown, ArrowUp, Delete, Edit, Plus, Rank, Top } from '@element-plus/icons-vue';
import type { EditableManager } from '@/modules/no-code/compositions/edit-mfe-structure';
import { canMoveStep, parentQlId } from '../../services/structure-ops';
import { clearEditingState, editingState, ownerOf, renderedBlock, selectBlock } from '../../compositions/page-editing';

const props = defineProps<{ manager: EditableManager; structure: string; extraTags: string[] }>();

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const GRACE_MS = 160;
const SAFE_TOP = 68; // keep the toolbar below the app header

const activeEl = ref<Element | null>(null);
const box = ref<Box | null>(null);
const toolbarWidth = ref(0);
const toolbar = ref<HTMLElement>();
const drop = ref<{ box: Box; position: 'before' | 'after'; qlId: string } | null>(null);
let leaveTimer: ReturnType<typeof setTimeout> | undefined;
let frame = 0;

const activeQlId = computed(() => activeEl.value?.getAttribute('data-ql-id') || null);
const activeTag = computed(() => activeEl.value?.getAttribute('data-ql-tag') || '');
const isSelected = computed(() => !!activeQlId.value && activeQlId.value === editingState.selectedQlId);
const moves = computed(() => (activeQlId.value ? canMoveStep(props.structure, activeQlId.value) : { up: false, down: false }));
const parentId = computed(() => (activeQlId.value ? parentQlId(props.structure, activeQlId.value, props.extraTags) : undefined));

function readBox(el: Element): Box {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function tick() {
  frame = 0;
  const el = (editingState.hovered as Element | null) || renderedBlock(editingState.selectedQlId);
  if (!el || !el.isConnected) {
    activeEl.value = null;
    box.value = null;
    return;
  }
  activeEl.value = el;
  box.value = readBox(el);
  toolbarWidth.value = toolbar.value?.offsetWidth || toolbarWidth.value;
  frame = requestAnimationFrame(tick);
}

function ensureTicking() {
  if (!frame) frame = requestAnimationFrame(tick);
}

function onPointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return;
  const target = event.target as Element | null;
  if (!target || target.closest('.ql-edit-ui, .el-popper')) {
    clearTimeout(leaveTimer);
    return;
  }
  const block = ownerOf(target);
  if (block) {
    clearTimeout(leaveTimer);
    if (editingState.hovered !== block) editingState.hovered = block;
    ensureTicking();
  } else if (editingState.hovered) {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => (editingState.hovered = null), GRACE_MS);
  }
}

watch(
  () => [editingState.hovered, editingState.selectedQlId],
  () => ensureTicking(),
);

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && (editingState.selectedQlId || editingState.hovered)) clearEditingState();
}

/* drag and drop: the handle of the toolbar is the only draggable thing */
function onDragStart(event: DragEvent) {
  if (!activeQlId.value) return;
  event.dataTransfer?.setData('text/plain', activeQlId.value);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  props.manager.setDraggingQlId(activeQlId.value);
}

function onDragOver(event: DragEvent) {
  const dragging = props.manager.draggingQlId.value;
  if (!dragging) return;
  const target = (event.target as Element | null)?.closest('[data-ql-id]');
  const qlId = target?.getAttribute('data-ql-id');
  if (!target || !qlId || qlId === dragging) {
    drop.value = null;
    return;
  }
  event.preventDefault();
  const rect = target.getBoundingClientRect();
  drop.value = { qlId, position: event.clientY < rect.top + rect.height / 2 ? 'before' : 'after', box: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } };
}

function onDrop(event: DragEvent) {
  const dragged = props.manager.draggingQlId.value;
  const current = drop.value;
  if (!dragged || !current) return;
  event.preventDefault();
  drop.value = null;
  props.manager.reorderComponents(dragged, current.qlId, current.position).finally(() => props.manager.setDraggingQlId(null));
}

function onDragEnd() {
  drop.value = null;
  props.manager.setDraggingQlId(null);
}

onMounted(() => {
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('dragover', onDragOver);
  document.addEventListener('drop', onDrop);
  document.addEventListener('dragend', onDragEnd);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointermove', onPointerMove);
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('dragover', onDragOver);
  document.removeEventListener('drop', onDrop);
  document.removeEventListener('dragend', onDragEnd);
  cancelAnimationFrame(frame);
  clearTimeout(leaveTimer);
  clearEditingState();
});

const outlineStyle = computed(() => {
  const b = box.value;
  return b ? { transform: `translate(${b.left}px, ${b.top}px)`, inlineSize: `${b.width}px`, blockSize: `${b.height}px` } : undefined;
});

const toolbarStyle = computed(() => {
  const b = box.value;
  if (!b) return undefined;
  const above = b.top - 34 >= SAFE_TOP;
  const top = above ? b.top - 34 : Math.max(b.top + 4, SAFE_TOP);
  const maxLeft = window.innerWidth - toolbarWidth.value - 8;
  const left = Math.max(8, Math.min(b.left + b.width - toolbarWidth.value, maxLeft));
  return { transform: `translate(${left}px, ${top}px)` };
});

const dropStyle = computed(() => {
  const d = drop.value;
  if (!d) return undefined;
  const y = d.position === 'before' ? d.box.top : d.box.top + d.box.height;
  return { transform: `translate(${d.box.left}px, ${y - 1}px)`, inlineSize: `${d.box.width}px` };
});

const act = (fn: (id: string) => unknown) => activeQlId.value && fn(activeQlId.value);
const pick = () => act((id) => selectBlock(id));
</script>

<template>
  <Teleport to="body">
    <div class="ql-edit-ui">
      <div v-if="box" class="outline" :class="{ selected: isSelected }" :style="outlineStyle" aria-hidden="true" />
      <div v-if="drop" class="drop-line" :style="dropStyle" aria-hidden="true" />
      <div v-if="box" ref="toolbar" class="toolbar" :style="toolbarStyle" role="toolbar" :aria-label="$t('Block tools')" @pointerdown.stop @click.stop="pick">
        <span class="tag" dir="ltr">{{ activeTag }}</span>
        <button type="button" :title="$t('Edit')" :aria-label="$t('Edit')" @click="act(manager.editComponent)"><el-icon><Edit /></el-icon></button>
        <el-dropdown trigger="click" @command="(c: string) => act(c === 'before' ? manager.addComponentBefore : manager.addComponentAfter)">
          <button type="button" :title="$t('Add component')" :aria-label="$t('Add component')"><el-icon><Plus /></el-icon></button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="before">{{ $t('Add before') }}</el-dropdown-item>
              <el-dropdown-item command="after">{{ $t('Add after') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <button type="button" :disabled="!moves.up" :title="$t('Move up')" :aria-label="$t('Move up')" @click="act((id) => manager.moveComponent(id, 'up'))"><el-icon><ArrowUp /></el-icon></button>
        <button type="button" :disabled="!moves.down" :title="$t('Move down')" :aria-label="$t('Move down')" @click="act((id) => manager.moveComponent(id, 'down'))"><el-icon><ArrowDown /></el-icon></button>
        <button type="button" class="handle" draggable="true" :title="$t('Drag to move')" :aria-label="$t('Drag to move')" @dragstart="onDragStart"><el-icon><Rank /></el-icon></button>
        <button v-if="parentId" type="button" :title="$t('Select the block around this one')" :aria-label="$t('Select the block around this one')" @click="selectBlock(parentId!, { reveal: true })"><el-icon><Top /></el-icon></button>
        <button type="button" class="danger" :title="$t('Remove')" :aria-label="$t('Remove')" @click="act(manager.removeComponent)"><el-icon><Delete /></el-icon></button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.ql-edit-ui {
  position: fixed;
  inset: 0;
  z-index: 1900;
  pointer-events: none;
}

.outline {
  position: absolute;
  inset: 0 auto auto 0;
  outline: 1px dashed var(--el-color-primary);
  outline-offset: -1px;
  background: color-mix(in srgb, var(--el-color-primary) 6%, transparent);

  &.selected {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }
}

.drop-line {
  position: absolute;
  inset: 0 auto auto 0;
  block-size: 3px;
  border-radius: 2px;
  background: var(--el-color-primary);
}

.toolbar {
  position: absolute;
  inset: 0 auto auto 0;
  display: flex;
  align-items: center;
  gap: 2px;
  block-size: 30px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--el-color-primary);
  color: #fff;
  box-shadow: 0 4px 14px rgb(0 0 0 / 0.18);
  pointer-events: auto;
  white-space: nowrap;

  button {
    display: grid;
    place-items: center;
    inline-size: 26px;
    block-size: 24px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    cursor: pointer;

    &:hover:not(:disabled) {
      background: rgb(255 255 255 / 0.2);
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }

    &:focus-visible {
      outline: 2px solid #fff;
      outline-offset: -2px;
    }

    &.handle {
      cursor: grab;
    }

    &.danger:hover {
      background: var(--el-color-danger);
    }
  }
}

.tag {
  max-inline-size: 140px;
  margin-inline: 4px 6px;
  overflow: hidden;
  font-size: 0.75rem;
  font-weight: 600;
  text-overflow: ellipsis;
}
</style>
