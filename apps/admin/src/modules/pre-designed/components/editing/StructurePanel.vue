<script setup lang="ts">
import { computed } from 'vue';
import { ArrowDown, ArrowUp, Close, Delete, Edit, Plus } from '@element-plus/icons-vue';
import type { EditableManager } from '@/modules/no-code/compositions/edit-mfe-structure';
import { buildStructureRows, canMoveStep } from '../../services/structure-ops';
import { editingState, selectBlock } from '../../compositions/page-editing';

const props = defineProps<{ structure: string; extraTags: string[]; manager: EditableManager }>();
defineEmits<{ (e: 'close'): void }>();

const rows = computed(() => buildStructureRows(props.structure, props.extraTags));
const moves = computed(() => Object.fromEntries(rows.value.map((r) => [r.qlId, canMoveStep(props.structure, r.qlId)])));

function hover(qlId: string | null) {
  editingState.hovered = qlId ? document.querySelector(`[data-ql-id="${CSS.escape(qlId)}"][data-ql-tag]`) : null;
}
</script>

<template>
  <aside class="panel ql-edit-ui" :aria-label="$t('Page structure')">
    <header>
      <h2>{{ $t('Page structure') }}</h2>
      <el-button text circle :icon="Close" :aria-label="$t('Close')" @click="$emit('close')" />
    </header>
    <p v-if="!rows.length" class="empty">{{ $t('This page has no blocks yet.') }}</p>
    <ul v-else role="tree">
      <li v-for="row in rows" :key="row.qlId" role="treeitem" :aria-selected="editingState.selectedQlId === row.qlId" :class="{ on: editingState.selectedQlId === row.qlId }" :style="{ '--depth': row.depth }" @mouseenter="hover(row.qlId)" @mouseleave="hover(null)">
        <button type="button" class="pick" @click="selectBlock(row.qlId, { reveal: true })">
          <span class="tag" dir="ltr">{{ row.tag }}</span>
          <span v-if="row.label" class="label" dir="auto">{{ row.label }}</span>
          <span v-if="row.conditional" class="flag" :title="$t('Shown only under a condition')">{{ $t('if') }}</span>
          <span v-if="row.repeated" class="flag" :title="$t('Repeated for every item')">{{ $t('each') }}</span>
        </button>
        <span class="actions">
          <button type="button" :aria-label="$t('Edit')" @click="manager.editComponent(row.qlId)"><el-icon><Edit /></el-icon></button>
          <button type="button" :aria-label="$t('Add after')" @click="manager.addComponentAfter(row.qlId)"><el-icon><Plus /></el-icon></button>
          <button type="button" :disabled="!moves[row.qlId]?.up" :aria-label="$t('Move up')" @click="manager.moveComponent(row.qlId, 'up')"><el-icon><ArrowUp /></el-icon></button>
          <button type="button" :disabled="!moves[row.qlId]?.down" :aria-label="$t('Move down')" @click="manager.moveComponent(row.qlId, 'down')"><el-icon><ArrowDown /></el-icon></button>
          <button type="button" class="danger" :aria-label="$t('Remove')" @click="manager.removeComponent(row.qlId)"><el-icon><Delete /></el-icon></button>
        </span>
      </li>
    </ul>
  </aside>
</template>

<style scoped lang="scss">
.panel {
  position: fixed;
  inset-block: 64px 0;
  inset-inline-end: 0;
  z-index: 1700;
  display: flex;
  flex-direction: column;
  inline-size: 320px;
  max-inline-size: 100vw;
  border-inline-start: 1px solid var(--el-border-color-lighter);
  background: var(--surface, var(--el-bg-color));
  box-shadow: -6px 0 18px rgb(0 0 0 / 0.06);
  pointer-events: auto;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 6px 16px;

  h2 {
    margin: 0;
    padding: 0;
    font-size: 1rem;
  }
}

.empty {
  margin: 8px 16px;
  padding: 0;
  color: var(--el-text-color-secondary);
}

ul {
  flex: 1;
  margin: 0;
  padding: 4px 8px 16px;
  overflow-y: auto;
  list-style: none;
}

li {
  display: flex;
  align-items: center;
  border-radius: 8px;
  padding-inline-start: calc(var(--depth) * 14px);

  &:hover,
  &.on {
    background: var(--el-fill-color-light);
  }

  &.on {
    background: var(--el-color-primary-light-9);
  }

  &:hover .actions,
  &:focus-within .actions,
  &.on .actions {
    display: flex;
  }
}

.pick {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-inline-size: 0;
  padding: 6px 8px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.tag {
  flex-shrink: 0;
  font-family: var(--el-font-family-mono, ui-monospace, monospace);
  font-size: 0.8rem;
  font-weight: 600;
}

.label {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flag {
  flex-shrink: 0;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  font-size: 0.7rem;
}

.actions {
  display: none;
  align-items: center;
  flex-shrink: 0;
  padding-inline-end: 4px;

  button {
    display: grid;
    place-items: center;
    inline-size: 24px;
    block-size: 24px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--el-text-color-regular);
    cursor: pointer;

    &:hover:not(:disabled) {
      background: var(--el-fill-color-darker);
    }

    &:disabled {
      opacity: 0.35;
      cursor: default;
    }

    &.danger:hover {
      background: var(--el-color-danger-light-8);
      color: var(--el-color-danger);
    }
  }
}

@media (max-width: 720px) {
  .panel {
    inset-block: auto 0;
    inset-inline: 0;
    inline-size: 100%;
    block-size: 55vh;
    border-inline-start: 0;
    border-block-start: 1px solid var(--el-border-color-lighter);
  }

  .actions {
    display: flex;
  }
}
</style>
