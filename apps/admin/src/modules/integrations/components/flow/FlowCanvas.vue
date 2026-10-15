<script lang="ts" setup>
import { nextTick, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import { useFlowCanvasStore } from '../../store/flow-canvas';
import IntegrationNode from './IntegrationNode.vue';
import EventNode from './EventNode.vue';
import FlowToolbar from './FlowToolbar.vue';
import FlowInspector from './FlowInspector.vue';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';

const store = useFlowCanvasStore();
const { nodes, edges, showMinimap, selected } = storeToRefs(store);
const { fitView, onNodeClick, onPaneClick } = useVueFlow();

onNodeClick(({ node }) => store.select(node.id));
onPaneClick(() => store.select(null));

const fit = () => fitView({ padding: 0.15, maxZoom: 1 });

// re-fit when the set of visible nodes changes (a filter, or integrations loading), not on every selection
watch(
  () => nodes.value.map((node) => node.id).join(','),
  () => nextTick(fit),
);
</script>

<template>
  <section class="canvas" :aria-label="$t('Flow canvas')">
    <FlowToolbar @fit="fit" />
    <div class="stage" :class="{ 'with-inspector': !!selected }">
      <div class="graph">
        <VueFlow
          :nodes="nodes"
          :edges="edges"
          :nodes-connectable="false"
          :min-zoom="0.2"
          :max-zoom="1.6"
          :default-edge-options="{ type: 'smoothstep', animated: false }"
          fit-view-on-init
          @nodes-initialized="fit"
        >
          <template #node-integration="props"><IntegrationNode v-bind="props" /></template>
          <template #node-event="props"><EventNode v-bind="props" /></template>
          <Background :gap="22" pattern-color="var(--el-border-color-lighter)" />
          <Controls position="bottom-left" :show-interactive="false" />
          <MiniMap v-if="showMinimap" pannable zoomable />
        </VueFlow>
      </div>
      <FlowInspector />
    </div>
  </section>
</template>

<style scoped lang="scss">
.canvas {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stage {
  display: flex;
  gap: 12px;
  block-size: min(70vh, 720px);
  min-block-size: 420px;
}

.graph {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--el-fill-color-lighter);
}

// theme the canvas parts with the app's tokens
:deep(.vue-flow__edge-path) {
  stroke: var(--el-color-primary-light-5);
  stroke-width: 2;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path),
:deep(.vue-flow__edge:hover .vue-flow__edge-path) {
  stroke: var(--el-color-primary);
}

:deep(.vue-flow__edge-text) {
  fill: var(--el-text-color-secondary);
  font-size: 11px;
}

:deep(.vue-flow__edge-textbg) {
  fill: var(--el-fill-color-lighter);
}

:deep(.vue-flow__arrowhead polyline) {
  stroke: var(--el-color-primary-light-5);
  fill: var(--el-color-primary-light-5);
}

:deep(.vue-flow__node),
:deep(.vue-flow__edge) {
  transition: opacity 0.15s ease;
}

:deep(.vue-flow__node.dim),
:deep(.vue-flow__edge.dim) {
  opacity: 0.25;
}

:deep(.vue-flow__node-integration),
:deep(.vue-flow__node-event) {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}

:deep(.vue-flow__controls) {
  box-shadow: none;
}

:deep(.vue-flow__controls-button) {
  border-color: var(--el-border-color-lighter);
  background: var(--surface);
  fill: var(--el-text-color-regular);
}

:deep(.vue-flow__minimap) {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--surface);
}

// narrow screens: the inspector goes under the canvas instead of squeezing it
@media (max-width: 1099px) {
  .stage {
    flex-direction: column;
    block-size: auto;
    min-block-size: 0;
  }

  .graph {
    block-size: 420px;
  }

  .stage :deep(.inspector) {
    inline-size: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.vue-flow__node),
  :deep(.vue-flow__edge) {
    transition: none;
  }
}
</style>
