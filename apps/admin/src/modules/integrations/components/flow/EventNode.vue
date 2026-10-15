<script lang="ts" setup>
import { Handle, Position, type NodeProps } from '@vue-flow/core';
import type { EventNodeData } from '../../services/flow-graph';

defineProps<NodeProps<EventNodeData>>();
</script>

<template>
  <article class="event" :class="{ selected }" :aria-label="data.signature.eventName">
    <font-awesome-icon :icon="['fas', 'bolt']" class="icon" aria-hidden="true" />
    <span class="text">
      <strong dir="auto">{{ data.signature.eventName }}</strong>
      <small dir="auto">{{ data.signature.source }} · {{ data.signature.kind }}</small>
    </span>
    <Handle type="source" :position="Position.Right" class="handle" />
  </article>
</template>

<style scoped lang="scss">
.event {
  display: flex;
  align-items: center;
  gap: 10px;
  inline-size: 220px;
  padding: 8px 12px;
  border: 1px dashed var(--el-color-primary-light-5);
  border-radius: 999px;
  background: var(--el-color-primary-light-9);
  color: var(--el-text-color-primary);
  cursor: pointer;

  &.selected {
    border-style: solid;
    border-color: var(--el-color-primary);
  }
}

.icon {
  flex: none;
  color: var(--el-color-primary);
}

.text {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 0.85rem;
  }

  small {
    color: var(--el-text-color-secondary);
    font-size: 0.72rem;
  }
}

.handle {
  inline-size: 9px;
  block-size: 9px;
  border: 2px solid var(--surface);
  background: var(--el-color-primary);
}
</style>
