<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { IBlueprint } from '@qelos/global-types';
import BlueprintGraphInspector from './BlueprintGraphInspector.vue';
import { NODE_H, NODE_W, fitTransform, layoutBlueprintGraph, neighboursOf } from '../services/blueprint-graph';

const props = defineProps<{ blueprints: IBlueprint[] }>();

const layout = computed(() => layoutBlueprintGraph(props.blueprints));
const byId = computed(() => new Map(props.blueprints.map((blueprint) => [blueprint.identifier, blueprint])));
const selectedId = ref<string | null>(null);
const selected = computed(() => (selectedId.value ? byId.value.get(selectedId.value) || null : null));
const related = computed(() => (selectedId.value ? neighboursOf(layout.value.edges, selectedId.value) : null));

// nodes in reading order, so Tab walks the graph left to right
const ordered = computed(() => [...layout.value.nodes].sort((a, b) => a.x - b.x || a.y - b.y));
const meta = (identifier: string) => {
  const blueprint = byId.value.get(identifier);
  const properties = Object.keys(blueprint?.properties || {}).length;
  const links = layout.value.edges.filter((edge) => edge.source === identifier).length;
  return { properties, links };
};

const edgeState = (edge: { source: string; target: string }) => {
  if (!selectedId.value) return '';
  return edge.source === selectedId.value || edge.target === selectedId.value ? 'on' : 'off';
};
const nodeState = (identifier: string) => {
  if (!related.value) return '';
  if (identifier === selectedId.value) return 'selected';
  return related.value.has(identifier) ? 'related' : 'off';
};
const labelWidth = (key: string) => Math.max(28, key.length * 6.6 + 14);

// --- pan and zoom ---------------------------------------------------------
const viewport = ref<HTMLElement | null>(null);
const view = ref({ scale: 1, x: 0, y: 0 });
const touched = ref(false);
let observer: ResizeObserver | undefined;
let lastWidth = 0;

function fit() {
  const el = viewport.value;
  if (!el) return;
  lastWidth = el.clientWidth;
  view.value = fitTransform(layout.value, { width: el.clientWidth, height: el.clientHeight }, { minScale: 0.55 });
  touched.value = false;
}

function zoomAt(factor: number, around?: { x: number; y: number }) {
  const el = viewport.value;
  if (!el) return;
  const { scale, x, y } = view.value;
  const next = Math.min(2, Math.max(0.2, scale * factor));
  const focus = around || { x: el.clientWidth / 2, y: el.clientHeight / 2 };
  const ratio = next / scale;
  view.value = { scale: next, x: focus.x - (focus.x - x) * ratio, y: focus.y - (focus.y - y) * ratio };
  touched.value = true;
}

function onWheel(event: WheelEvent) {
  const el = viewport.value;
  if (!el) return;
  if (event.ctrlKey || event.metaKey) {
    const rect = el.getBoundingClientRect();
    zoomAt(event.deltaY < 0 ? 1.1 : 1 / 1.1, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  } else {
    view.value = { ...view.value, x: view.value.x - event.deltaX, y: view.value.y - event.deltaY };
    touched.value = true;
  }
}

let drag: { id: number; startX: number; startY: number; origin: { x: number; y: number }; moved: boolean } | null = null;
function onPointerDown(event: PointerEvent) {
  if ((event.target as HTMLElement).closest('.node, .tools, .hint')) return;
  drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, origin: { x: view.value.x, y: view.value.y }, moved: false };
  viewport.value?.setPointerCapture(event.pointerId);
}
function onPointerMove(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.moved && Math.hypot(dx, dy) < 4) return;
  drag.moved = true;
  view.value = { ...view.value, x: drag.origin.x + dx, y: drag.origin.y + dy };
  touched.value = true;
}
function onPointerUp(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return;
  if (!drag.moved) selectedId.value = null;
  drag = null;
}

function choose(identifier: string) {
  selectedId.value = selectedId.value === identifier ? null : identifier;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && selectedId.value) selectedId.value = null;
}

onMounted(() => {
  fit();
  lastWidth = viewport.value?.clientWidth || 0;
  observer = new ResizeObserver(() => {
    const el = viewport.value;
    if (!el) return;
    if (!touched.value && !selectedId.value) return fit();
    // the canvas changed size (the inspector opened): keep what is in the middle in the middle
    view.value = { ...view.value, x: view.value.x + (el.clientWidth - lastWidth) / 2 };
    lastWidth = el.clientWidth;
  });
  if (viewport.value) observer.observe(viewport.value);
});
onBeforeUnmount(() => observer?.disconnect());

watch(layout, () => {
  if (selectedId.value && !byId.value.has(selectedId.value)) selectedId.value = null;
  if (!touched.value) nextTick(fit);
});

const percent = computed(() => `${Math.round(view.value.scale * 100)}%`);
</script>

<template>
  <div class="graph" :class="{ inspecting: selected }">
    <div
      ref="viewport"
      class="canvas"
      role="group"
      :aria-label="$t('Blueprint relations graph')"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown="onKeydown"
    >
      <div class="stage" :style="{ inlineSize: layout.width + 'px', blockSize: layout.height + 'px', transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }">
        <svg class="edges" :width="layout.width" :height="layout.height" aria-hidden="true">
          <defs>
            <marker id="bp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" class="tip" />
            </marker>
            <marker id="bp-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" class="tip on" />
            </marker>
          </defs>
          <g v-for="edge in layout.edges" :key="edge.id" class="edge" :class="edgeState(edge)">
            <path :d="edge.path" class="line" :marker-end="edgeState(edge) === 'on' ? 'url(#bp-arrow-on)' : 'url(#bp-arrow)'" />
            <g class="tag" :transform="`translate(${edge.label.x}, ${edge.label.y})`">
              <rect :x="-labelWidth(edge.key) / 2" y="-9" :width="labelWidth(edge.key)" height="18" rx="9" />
              <text text-anchor="middle" dominant-baseline="central">{{ edge.key }}</text>
            </g>
          </g>
        </svg>

        <p v-if="layout.unlinkedAt" class="caption" :style="{ insetInlineStart: layout.unlinkedAt.x + 'px', insetBlockStart: layout.unlinkedAt.y + 'px' }">{{ $t('Not linked to anything') }}</p>

        <button
          v-for="node in ordered"
          :id="'graph-node-' + node.identifier"
          :key="node.identifier"
          type="button"
          class="node"
          :class="[nodeState(node.identifier), { loose: node.unlinked && layout.unlinkedAt }]"
          :style="{ insetInlineStart: node.x + 'px', insetBlockStart: node.y + 'px', inlineSize: NODE_W + 'px', blockSize: NODE_H + 'px' }"
          :aria-pressed="selectedId === node.identifier"
          @click="choose(node.identifier)"
        >
          <strong dir="auto">{{ node.name }}</strong>
          <code dir="ltr">{{ node.identifier }}</code>
          <small>
            {{ meta(node.identifier).properties === 1 ? $t('1 property') : $t('{count} properties', { count: meta(node.identifier).properties }) }}<template v-if="meta(node.identifier).links"> · {{ meta(node.identifier).links === 1 ? $t('1 link') : $t('{count} links', { count: meta(node.identifier).links }) }}</template>
          </small>
        </button>
      </div>

      <div v-if="blueprints.length && !layout.edges.length" class="hint" role="note">
        <strong>{{ $t('Nothing links to anything yet') }}</strong>
        <span dir="auto">{{ $t('Open a blueprint, pick a text property and set "Links to": an arrow appears here.') }}</span>
      </div>

      <div class="tools" role="toolbar" :aria-label="$t('Zoom')">
        <el-button text circle size="small" :aria-label="$t('Zoom out')" @click="zoomAt(1 / 1.25)"><font-awesome-icon :icon="['fas', 'minus']" /></el-button>
        <span class="percent" aria-live="polite">{{ percent }}</span>
        <el-button text circle size="small" :aria-label="$t('Zoom in')" @click="zoomAt(1.25)"><font-awesome-icon :icon="['fas', 'plus']" /></el-button>
        <el-button text size="small" @click="fit">{{ $t('Fit') }}</el-button>
      </div>

      <p class="legend">
        <svg width="22" height="10" aria-hidden="true"><path d="M 1 5 H 17" class="legend-line" /><path d="M 13 1.5 L 20 5 L 13 8.5 z" class="tip" /></svg>
        <span dir="auto">{{ $t('Points to the blueprint a property links to; the label is that property.') }}</span>
      </p>
    </div>

    <BlueprintGraphInspector v-if="selected" class="side" :blueprint="selected" :blueprints="blueprints" @select="selectedId = $event" @close="selectedId = null" />
  </div>
</template>

<style scoped>
.graph {
  display: flex;
  gap: 12px;
  block-size: clamp(460px, 72vh, 880px);
}

.canvas {
  position: relative;
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background-color: var(--el-fill-color-lighter);
  background-image: radial-gradient(var(--el-border-color-lighter) 1px, transparent 1px);
  background-size: 22px 22px;
  cursor: grab;
  touch-action: none;
}

.canvas:active {
  cursor: grabbing;
}

.stage {
  position: absolute;
  inset-block-start: 0;
  inset-inline-start: 0;
  transform-origin: 0 0;
  /* a coordinate canvas: positions are computed left to right, so it never mirrors (text inside still follows its own direction) */
  direction: ltr;
}

.edges {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.line {
  fill: none;
  stroke: var(--el-border-color-darker);
  stroke-width: 1.6;
  transition: stroke 0.15s ease, opacity 0.15s ease;
}

.tip {
  fill: var(--el-border-color-darker);
}

.tip.on {
  fill: var(--el-color-primary);
}

.edge.on .line {
  stroke: var(--el-color-primary);
  stroke-width: 2.4;
}

.edge.off {
  opacity: 0.18;
}

.tag rect {
  fill: var(--surface, var(--el-bg-color));
  stroke: var(--el-border-color-lighter);
}

.tag text {
  fill: var(--el-text-color-secondary);
  font-size: 11px;
  font-family: var(--el-font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
}

.edge.on .tag rect {
  stroke: var(--el-color-primary);
}

.edge.on .tag text {
  fill: var(--el-color-primary);
}

.node {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  padding: 8px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: var(--surface, var(--el-bg-color));
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.node:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 4px 14px rgb(0 0 0 / 0.1);
}

.node:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.node.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  box-shadow: 0 0 0 3px var(--el-color-primary-light-8);
}

.node.loose {
  border-style: dashed;
}

.node.related {
  border-color: var(--el-color-primary-light-5);
}

.node.off {
  opacity: 0.45;
}

.node strong {
  overflow: hidden;
  font-size: 0.95rem;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node code {
  overflow: hidden;
  line-height: 1.2;
  color: var(--el-text-color-secondary);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node small {
  line-height: 1.2;
  color: var(--el-text-color-secondary);
  font-size: 0.75rem;
}

.caption {
  position: absolute;
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  font-weight: 600;
}

.hint {
  position: absolute;
  inset-block-start: 14px;
  inset-inline: 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-inline-size: 460px;
  margin-inline: auto;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--surface, var(--el-bg-color));
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  cursor: default;
}

.hint strong {
  color: var(--el-text-color-primary);
}

.tools {
  position: absolute;
  inset-block-end: 12px;
  inset-inline-end: 12px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  background: var(--surface, var(--el-bg-color));
  cursor: default;
}

.percent {
  min-inline-size: 40px;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  text-align: center;
}

.legend {
  position: absolute;
  inset-block-end: 12px;
  inset-inline-start: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  max-inline-size: calc(100% - 260px);
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.78rem;
  line-height: 1.3;
  pointer-events: none;
}

.legend-line {
  fill: none;
  stroke: var(--el-border-color-darker);
  stroke-width: 1.6;
}

.side {
  flex: 0 0 320px;
}

@media (max-width: 900px) {
  .graph {
    flex-direction: column;
    block-size: auto;
  }

  .canvas {
    block-size: clamp(380px, 62vh, 640px);
    flex: none;
  }

  .side {
    flex: none;
    max-block-size: 60vh;
  }

  .legend {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .line,
  .node {
    transition: none;
  }
}
</style>
