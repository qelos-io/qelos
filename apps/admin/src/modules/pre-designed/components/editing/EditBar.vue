<script setup lang="ts">
import { ArrowDown, Check, CopyDocument, Delete, Document, Menu, Plus, Setting } from '@element-plus/icons-vue';

defineProps<{ pageName: string; structureOpen: boolean }>();
defineEmits<{
  (e: 'add'): void;
  (e: 'code'): void;
  (e: 'structure'): void;
  (e: 'settings'): void;
  (e: 'clone'): void;
  (e: 'remove'): void;
  (e: 'done'): void;
}>();

</script>

<template>
  <div class="edit-bar ql-edit-ui" role="toolbar" :aria-label="$t('Page editing')">
    <span class="status"><span class="dot" aria-hidden="true" />{{ $t('Editing') }}<strong dir="auto">{{ pageName }}</strong></span>

    <div class="tools">
      <el-button id="no-code-wizard-btn" type="primary" :icon="Plus" @click="$emit('add')">{{ $t('Add component') }}</el-button>
      <el-button :icon="Menu" :type="structureOpen ? 'primary' : 'default'" :plain="structureOpen" @click="$emit('structure')">{{ $t('Structure') }}</el-button>
      <el-button id="no-code-code-btn" :icon="Document" @click="$emit('code')">{{ $t('Code') }}</el-button>
      <el-dropdown trigger="click" @command="(c: string) => $emit(c as any)">
        <el-button :aria-label="$t('Page options')">{{ $t('Page') }}<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="settings" :icon="Setting">{{ $t('Page settings') }}</el-dropdown-item>
            <el-dropdown-item command="clone" :icon="CopyDocument">{{ $t('Clone page') }}</el-dropdown-item>
            <el-dropdown-item command="remove" :icon="Delete" divided>{{ $t('Remove page') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <el-button class="done" :icon="Check" @click="$emit('done')">{{ $t('Done') }}</el-button>
  </div>
</template>

<style scoped lang="scss">
.edit-bar {
  position: sticky;
  inset-block-start: 6px; /* the page scrolls below the app header, so this is just under it */
  z-index: 80;
  margin-block-end: 8px;
  border-radius: 12px;
  border: 1px solid var(--el-color-primary-light-7);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  background: var(--el-color-primary-light-9);
  pointer-events: auto;
}

.status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-inline-size: 0;
  color: var(--el-color-primary);
  font-size: 0.9rem;

  strong {
    overflow: hidden;
    color: var(--el-text-color-primary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.dot {
  flex-shrink: 0;
  inline-size: 8px;
  block-size: 8px;
  border-radius: 50%;
  background: var(--el-color-primary);
}

.tools {
  display: flex;
  flex: 1;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-inline-start: 12px;

  .el-button {
    margin: 0;
  }
}

@media (max-width: 720px) {
  .edit-bar {
    position: fixed;
    inset-block: auto 56px;
    inset-inline: 0;
    flex-wrap: wrap;
    padding: 8px 10px;
    border-block-start: 1px solid var(--el-color-primary-light-7);
    border-block-end: 0;
  }

  .status strong,
  .status {
    display: none;
  }

  .tools {
    margin: 0;
  }
}
</style>
