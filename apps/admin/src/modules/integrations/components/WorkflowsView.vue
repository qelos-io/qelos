<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElButton, ElEmpty } from 'element-plus';
import { ZoomIn, ZoomOut, Refresh } from '@element-plus/icons-vue';
import { useIntegrationsStore } from '../store/integrations';
import { useIntegrationSourcesStore } from '../store/integration-sources';
import { useIntegrationKinds } from '../compositions/integration-kinds';
import type { IIntegration } from '@qelos/global-types';
import { OpenAITargetOperation, QelosTriggerOperation } from '@qelos/global-types';

interface Signature {
  source: string;
  kind: string;
  eventName: string;
}

interface IntegrationConnection {
  id: string;
  fromId: string;
  toId: string;
}

interface IntegrationArrow extends IntegrationConnection {
  path: string;
}

const route = useRoute();
const router = useRouter();
const integrationsStore = useIntegrationsStore();
const integrationSourcesStore = useIntegrationSourcesStore();
const integrationKinds = useIntegrationKinds();

const globalSearchQuery = computed(() => (route.query.q as string) || '');
const hoveredIntegrationId = ref<string | null>(null);
const zoomLevel = ref(1);
const zoomBounds = { min: 0.6, max: 2.4 };
const zoomSensitivity = 0.0015;
const panX = ref(0);
const panY = ref(0);
const showInactive = ref(true);
const integrationDiagramRef = ref<HTMLElement | null>(null);
const viewportSize = ref({ width: 0, height: 0 });
let resizeObserver: ResizeObserver | null = null;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const workflowTransformStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoomLevel.value})`,
  transformOrigin: '0 0'
}));

const handleWorkflowWheel = (event: WheelEvent) => {
  if (event.ctrlKey) {
    event.preventDefault();
    setZoomLevel(zoomLevel.value - event.deltaY * zoomSensitivity);
    return;
  }

  event.preventDefault();
  panX.value = clamp(panX.value - event.deltaX, minPanX.value, 0);
  panY.value = clamp(panY.value - event.deltaY, minPanY.value, 0);
};

const cleanupResizeObserver = () => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
};

const isIntegrationActive = (integration: IIntegration) => integration.active !== false;

const sourcesById = computed(() => {
  if (!integrationSourcesStore.result) return {} as Record<string, any>;
  return integrationSourcesStore.result.reduce((acc, source) => {
    acc[source._id] = source;
    return acc;
  }, {} as Record<string, any>);
});

const filteredIntegrations = computed(() => {
  const integrations = integrationsStore.integrations || [];
  const query = globalSearchQuery.value.trim().toLowerCase();

  return integrations.filter(integration => {
    if (!showInactive.value && !isIntegrationActive(integration)) return false;

    if (!query) return true;

    const triggerName = sourcesById.value[integration.trigger?.source]?.name || '';
    const targetName = sourcesById.value[integration.target?.source]?.name || '';
    const triggerOp = integration.trigger?.operation || '';
    const targetOp = integration.target?.operation || '';
    const triggerDetails = integration.trigger?.details?.name || '';
    const targetDetails = integration.target?.details?.name || '';

    return [
      triggerName,
      targetName,
      triggerOp,
      targetOp,
      triggerDetails,
      targetDetails,
      integration._id
    ].some(value => value?.toLowerCase().includes(query));
  });
});

const getStepStatus = (integration: IIntegration, stepId: string) => {
  switch (stepId) {
    case 'trigger':
      return integration.trigger?.source && integration.trigger?.details ? 'success' : 'error';
    case 'data-manipulation':
      return 'success';
    case 'target':
      return integration.target?.source && integration.target?.details ? 'success' : 'error';
    case 'trigger-response':
      return integration.target?.details?.triggerResponse ? 'success' : 'inactive';
    default:
      return 'inactive';
  }
};

const getNodeColor = (status: string) => {
  switch (status) {
    case 'success':
      return '#67c23a';
    case 'error':
      return '#f56c6c';
    case 'warning':
      return '#e6a23c';
    case 'inactive':
      return '#dcdfe6';
    default:
      return '#909399';
  }
};

const getWorkflowSteps = (integration: IIntegration) => ([
  { id: 'trigger', title: 'Trigger', subtitle: integration.trigger?.operation },
  { id: 'data-manipulation', title: 'Data Manipulation' },
  { id: 'target', title: 'Target', subtitle: integration.target?.operation },
  { id: 'trigger-response', title: 'Trigger Response' }
]);

const getSourceName = (sourceId?: string) => sourcesById.value[sourceId || '']?.name || 'Unknown';

const getIntegrationDisplayName = (integration: IIntegration) => integration.trigger?.details?.name || '';
const getIntegrationDescription = (integration: IIntegration) => integration.target?.details?.description || 'No description';

const getSourceLogo = (sourceId?: string) => {
  if (!sourceId) return null;
  const source = sourcesById.value[sourceId];
  if (!source?.kind) return null;
  return integrationKinds[source.kind]?.logo || null;
};

const goToIntegration = (integrationId: string) => {
  router.push({ query: { mode: 'edit', id: integrationId } });
};

const trackHeight = 130;
const nodeSpacing = 140;
const nodeY = 70;
const baseSvgWidth = 1000;
const triggerNodeIndex = 0;
const triggerResponseNodeIndex = 3;
const nodeRadius = 24;
const rightShiftOffset = (triggerResponseNodeIndex - triggerNodeIndex) * nodeSpacing;

const svgHeight = computed(() => Math.max(filteredIntegrations.value.length * trackHeight + 80, 200));
const svgWidth = computed(() => baseSvgWidth + rightShiftOffset);
const svgViewBox = computed(() => `0 0 ${svgWidth.value} ${svgHeight.value}`);

const scaledWidth = computed(() => svgWidth.value * zoomLevel.value);
const scaledHeight = computed(() => svgHeight.value * zoomLevel.value);
const minPanX = computed(() => Math.min(0, viewportSize.value.width - scaledWidth.value));
const minPanY = computed(() => Math.min(0, viewportSize.value.height - scaledHeight.value));

const clampPanOffsets = () => {
  panX.value = clamp(panX.value, minPanX.value, 0);
  panY.value = clamp(panY.value, minPanY.value, 0);
};

const setZoomLevel = (value: number) => {
  const next = clamp(value, zoomBounds.min, zoomBounds.max);
  zoomLevel.value = Number(next.toFixed(3));
  clampPanOffsets();
};

const zoomIn = () => setZoomLevel(zoomLevel.value + 0.15);
const zoomOut = () => setZoomLevel(zoomLevel.value - 0.15);
const resetZoom = () => {
  zoomLevel.value = 1;
  panX.value = 0;
  panY.value = 0;
  clampPanOffsets();
};

const toggleInactiveVisibility = () => {
  showInactive.value = !showInactive.value;
};

onMounted(() => {
  if (typeof window === 'undefined' || !integrationDiagramRef.value) return;
  resizeObserver = new ResizeObserver(entries => {
    if (!entries.length) return;
    const { width, height } = entries[0].contentRect;
    viewportSize.value = { width, height };
    clampPanOffsets();
  });
  resizeObserver.observe(integrationDiagramRef.value);
});

onUnmounted(() => {
  cleanupResizeObserver();
});

const getTrackOffset = (index: number) => index * trackHeight;
const getNodeX = (index: number) => nodeSpacing * index + 100;
const getLineStartX = (index: number) => nodeSpacing * index + 120;
const getLineEndX = (index: number) => nodeSpacing * (index + 1) + 70;

watch([scaledWidth, scaledHeight, () => viewportSize.value.width, () => viewportSize.value.height], () => {
  clampPanOffsets();
});

watch(filteredIntegrations, () => {
  panX.value = 0;
  panY.value = 0;
  clampPanOffsets();
});

const createSignature = (source?: string, kind?: string, eventName?: string): Signature | null => {
  if (!source || !kind || !eventName) return null;
  return { source, kind, eventName };
};

const getTriggerSignature = (integration: IIntegration) => {
  const details = integration.trigger?.details || {};
  return createSignature(details.source, details.kind, details.eventName);
};

const getTriggerResponseSignature = (integration: IIntegration) => {
  const response = integration.target?.details?.triggerResponse || {};
  return createSignature(response.source, response.kind, response.eventName);
};

const getSignatureKey = (signature: Signature) => `${signature.source}::${signature.kind}::${signature.eventName}`;

const trackIndexByIntegration = computed(() => {
  return filteredIntegrations.value.reduce((acc, integration, index) => {
    acc[integration._id] = index;
    return acc;
  }, {} as Record<string, number>);
});

const chatCompletionIntegrations = computed(() =>
  filteredIntegrations.value.filter(
    integration => integration.trigger?.operation === QelosTriggerOperation.chatCompletion
  )
);

const functionCallingIntegrations = computed(() =>
  filteredIntegrations.value.filter(
    integration => integration.trigger?.operation === OpenAITargetOperation.functionCalling
  )
);

const functionToolConnections = computed<IntegrationConnection[]>(() => {
  const connections: IntegrationConnection[] = [];

  chatCompletionIntegrations.value.forEach(chatIntegration => {
    const details = chatIntegration.trigger?.details || {};
    const allowedListRaw = Array.isArray(details.allowedIntegrationIds) ? details.allowedIntegrationIds : [];
    const blockedList = Array.isArray(details.blockedIntegrationIds) ? details.blockedIntegrationIds : [];

    const allowAll = !allowedListRaw.length || allowedListRaw.includes('*');
    const allowedSet = new Set(allowedListRaw.filter(id => id !== '*'));
    const blockedSet = new Set(blockedList);

    functionCallingIntegrations.value.forEach(funcIntegration => {
      if (funcIntegration._id === chatIntegration._id) return;
      if (blockedSet.has(funcIntegration._id)) return;
      if (!allowAll && !allowedSet.has(funcIntegration._id)) return;

      connections.push({
        id: `function-tool-${chatIntegration._id}-${funcIntegration._id}`,
        fromId: chatIntegration._id,
        toId: funcIntegration._id
      });
    });
  });

  return connections;
});

const signatureBasedConnections = computed<IntegrationConnection[]>(() => {
  const triggersBySignature = new Map<string, IIntegration[]>();
  filteredIntegrations.value.forEach(integration => {
    const signature = getTriggerSignature(integration);
    if (!signature) return;
    const key = getSignatureKey(signature);
    if (!triggersBySignature.has(key)) {
      triggersBySignature.set(key, []);
    }
    triggersBySignature.get(key)!.push(integration);
  });

  const result: IntegrationConnection[] = [];
  filteredIntegrations.value.forEach(sourceIntegration => {
    const responseSignature = getTriggerResponseSignature(sourceIntegration);
    if (!responseSignature) return;

    const key = getSignatureKey(responseSignature);
    const destinations = triggersBySignature.get(key);
    if (!destinations?.length) return;

    destinations.forEach(destination => {
      if (destination._id === sourceIntegration._id) return;
      result.push({
        id: `${sourceIntegration._id}-${destination._id}-${key}`,
        fromId: sourceIntegration._id,
        toId: destination._id
      });
    });
  });
  return result;
});

const interIntegrationConnections = computed<IntegrationConnection[]>(() => [
  ...signatureBasedConnections.value,
  ...functionToolConnections.value
]);

const incomingIntegrationIds = computed(() => {
  const ids = new Set<string>();
  interIntegrationConnections.value.forEach(connection => {
    ids.add(connection.toId);
  });
  return ids;
});

const trackShiftByIntegration = computed(() => {
  return filteredIntegrations.value.reduce((acc, integration) => {
    acc[integration._id] = incomingIntegrationIds.value.has(integration._id) ? rightShiftOffset : 0;
    return acc;
  }, {} as Record<string, number>);
});

const getTrackShift = (integrationId: string) => trackShiftByIntegration.value[integrationId] || 0;

const getArrowPath = (connection: IntegrationConnection) => {
  const fromTrack = trackIndexByIntegration.value[connection.fromId];
  const toTrack = trackIndexByIntegration.value[connection.toId];
  if (fromTrack === undefined || toTrack === undefined) return '';

  const startX = getNodeX(triggerResponseNodeIndex) + nodeRadius + 6 + getTrackShift(connection.fromId);
  const startY = nodeY + getTrackOffset(fromTrack);
  const endX = getNodeX(triggerNodeIndex) - nodeRadius - 6 + getTrackShift(connection.toId);
  const endY = nodeY + getTrackOffset(toTrack);

  const verticalBend = Math.max(40, Math.abs(endY - startY) * 0.4);
  const direction = endY >= startY ? 1 : -1;

  const controlPoint1Y = startY + direction * verticalBend;
  const controlPoint2Y = endY - direction * verticalBend;
  const controlPoint1X = startX + 80;
  const controlPoint2X = endX - 80;

  return `M ${startX} ${startY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`;
};

const interIntegrationArrows = computed<IntegrationArrow[]>(() => {
  return interIntegrationConnections.value
    .map(connection => {
      const path = getArrowPath(connection);
      if (!path) return null;
      return { ...connection, path } as IntegrationArrow;
    })
    .filter((connection): connection is IntegrationArrow => Boolean(connection));
});

const isArrowConnected = (arrow: IntegrationArrow, integrationId: string | null) => {
  if (!integrationId) return false;
  return arrow.fromId === integrationId || arrow.toId === integrationId;
};
</script>

<template>
  <div class="workflows-view">
    <div class="workflows-header">
      <div class="workflows-actions">
        <div class="workflow-toolbar">
          <el-button-group>
            <el-button size="small" plain @click="zoomOut" title="Zoom out">
              <el-icon><ZoomOut /></el-icon>
            </el-button>
            <el-button size="small" plain @click="resetZoom" title="Reset zoom">
              <el-icon><Refresh /></el-icon>
              {{ $t('Reset') }}
            </el-button>
            <el-button size="small" plain @click="zoomIn" title="Zoom in">
              <el-icon><ZoomIn /></el-icon>
            </el-button>
          </el-button-group>

          <el-button
            size="small"
            :type="showInactive ? 'default' : 'primary'"
            plain
            @click="toggleInactiveVisibility"
          >
            {{ showInactive ? 'Hide Inactive' : 'Show Inactive' }}
          </el-button>
        </div>
      </div>
    </div>

    <div class="integration-list">
      <div v-if="filteredIntegrations.length === 0" class="empty-state">
        <el-empty description="No integrations found">
          <el-button type="primary" @click="router.push({ query: { mode: 'create' } })">
            Create Integration
          </el-button>
        </el-empty>
      </div>

      <div
        v-else
        ref="integrationDiagramRef"
        class="integration-diagram"
        dir="ltr"
        @wheel="handleWorkflowWheel"
      >
        <div class="workflow-viewport" :style="workflowTransformStyle">
          <svg
            class="workflow-svg"
            :viewBox="svgViewBox"
            preserveAspectRatio="xMidYMid meet"
            :height="svgHeight"
          >
          <defs>
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#409eff;stop-opacity:0.2" />
              <stop offset="50%" style="stop-color:#409eff;stop-opacity:0.8" />
              <stop offset="100%" style="stop-color:#409eff;stop-opacity:0.2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker
              id="arrowHead"
              markerWidth="10"
              markerHeight="10"
              refX="6"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L6,3 z" fill="#a0cfff" />
            </marker>
          </defs>

          <g class="inter-integration-arrows">
            <path
              v-for="arrow in interIntegrationArrows"
              :key="arrow.id"
              :d="arrow.path"
              marker-end="url(#arrowHead)"
              :class="[
                'inter-arrow',
                { 'inter-arrow--highlighted': isArrowConnected(arrow, hoveredIntegrationId) }
              ]"
            />
          </g>

          <template v-for="(integration, trackIndex) in filteredIntegrations" :key="integration._id">
            <text
              class="integration-title"
              :x="20 + getTrackShift(integration._id)"
              :y="getTrackOffset(trackIndex) + 18"
            >
              <tspan
                v-if="getIntegrationDisplayName(integration)"
                class="integration-title integration-title--name"
              >
                {{ getIntegrationDisplayName(integration) }} · 
              </tspan>
              <tspan>
                {{ getSourceName(integration.trigger?.source) }} → {{ getSourceName(integration.target?.source) }}
              </tspan>
              <tspan
                v-if="!isIntegrationActive(integration)"
                class="integration-status-tag"
              >
                · Inactive
              </tspan>
            </text>
            <text
              class="integration-description"
              :x="20 + getTrackShift(integration._id)"
              :y="getTrackOffset(trackIndex) + 36"
            >
              {{ getIntegrationDescription(integration) }}
            </text>
            <text
              v-if="hoveredIntegrationId === integration._id"
              class="click-hint"
              :x="20 + getTrackShift(integration._id)"
              :y="getTrackOffset(trackIndex) + 52"
            >
              Click to edit
            </text>

            <g
              :transform="`translate(${getTrackShift(integration._id)}, ${getTrackOffset(trackIndex)})`"
              class="integration-track"
              :class="{ 'integration-track--inactive': !isIntegrationActive(integration) }"
              @mouseenter="hoveredIntegrationId = integration._id"
              @mouseleave="hoveredIntegrationId = null"
              @click="goToIntegration(integration._id)"
            >
              <g class="connection-lines">
                <line
                  v-for="(step, index) in getWorkflowSteps(integration).slice(0, -1)"
                  :key="`line-${integration._id}-${step.id}`"
                  :x1="getLineStartX(index)"
                  :y1="nodeY"
                  :x2="getLineEndX(index)"
                  :y2="nodeY"
                  stroke="url(#flowGradient)"
                  stroke-width="2.5"
                  :class="{
                    'active-line': getStepStatus(integration, step.id) === 'success'
                  }"
                />
              </g>

              <g class="workflow-nodes">
                <g
                  v-for="(step, index) in getWorkflowSteps(integration)"
                  :key="`${integration._id}-${step.id}`"
                  :transform="`translate(${getNodeX(index)}, ${nodeY})`"
                  class="workflow-node"
                  :class="`status-${getStepStatus(integration, step.id)}`"
                >
                  <circle
                    r="30"
                    :fill="getNodeColor(getStepStatus(integration, step.id))"
                    opacity="0"
                    class="node-hover-circle"
                  />
                  <circle
                    r="24"
                    :fill="getNodeColor(getStepStatus(integration, step.id))"
                    stroke="white"
                    stroke-width="2"
                    filter="url(#glow)"
                    class="node-circle"
                  />
                  <text y="-2" text-anchor="middle" fill="white" font-size="12" font-weight="bold">
                    {{ index }}
                  </text>
                  <text y="38" text-anchor="middle" font-size="10" fill="#606266" class="node-label">
                    {{ step.title }}
                  </text>
                  <text v-if="step.subtitle" y="52" text-anchor="middle" font-size="8" fill="#909399" class="node-subtitle">
                    {{ step.subtitle }}
                  </text>

                  <g
                    v-if="step.id === 'trigger' && getSourceLogo(integration.trigger?.source)"
                    class="source-badge"
                    transform="translate(-4, -4)"
                  >
                    <defs>
                      <clipPath :id="`badge-clip-trigger-${integration._id}`">
                        <circle cx="18" cy="18" r="10" />
                      </clipPath>
                    </defs>
                    <g :clip-path="`url(#badge-clip-trigger-${integration._id})`">
                      <circle cx="18" cy="18" r="11" fill="white" stroke="#e0e0e0" stroke-width="1" />
                      <image
                        :href="getSourceLogo(integration.trigger?.source)"
                        x="10"
                        y="10"
                        width="16"
                        height="16"
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </g>
                  </g>

                  <g
                    v-if="step.id === 'target' && getSourceLogo(integration.target?.source)"
                    class="source-badge"
                    transform="translate(-4, -4)"
                  >
                    <defs>
                      <clipPath :id="`badge-clip-target-${integration._id}`">
                        <circle cx="18" cy="18" r="10" />
                      </clipPath>
                    </defs>
                    <g :clip-path="`url(#badge-clip-target-${integration._id})`">
                      <circle cx="18" cy="18" r="11" fill="white" stroke="#e0e0e0" stroke-width="1" />
                      <image
                        :href="getSourceLogo(integration.target?.source)"
                        x="10"
                        y="10"
                        width="16"
                        height="16"
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </template>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflows-view {
  width: 100%;
  padding: 12px;
  background: #f5f7fa;
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
}

.workflows-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 16px;
}

.workflows-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.workflows-title h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.workflows-title p {
  margin: 4px 0 0;
  color: #606266;
  font-size: 14px;
}

.search-input {
  width: 320px;
}

.workflow-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.integration-list {
  border-radius: 12px;
  background: white;
  padding: 12px 0;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.integration-diagram {
  position: relative;
  overflow: auto;
}

.integration-track {
  transition: opacity 0.2s ease;
}

.integration-track--inactive {
  opacity: 0.4;
}

.integration-status-tag {
  fill: #f56c6c;
  font-weight: 600;
  font-size: 12px;
}

.workflow-viewport {
  transform-origin: top left;
  transition: transform 0.12s ease-out;
  will-change: transform;
}

.workflow-svg {
  width: 100%;
}

.inter-integration-arrows {
  pointer-events: none;
}

.inter-arrow {
  fill: none;
  stroke: rgba(64, 158, 255, 0.45);
  stroke-width: 2;
  stroke-dasharray: 6 6;
  animation: flow-arrow 2s linear infinite;
}

.inter-arrow--highlighted {
  stroke: rgba(64, 158, 255, 0.85);
  stroke-width: 3.5;
  filter: drop-shadow(0 0 6px rgba(64, 158, 255, 0.55));
}

@keyframes flow-arrow {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: -24;
  }
}

.connection-lines line {
  stroke-dasharray: 140;
  stroke-dashoffset: 140;
  animation: draw-line 0.8s ease-out forwards;
  opacity: 0.75;
}

.connection-lines line:nth-child(1) { animation-delay: 0.15s; }
.connection-lines line:nth-child(2) { animation-delay: 0.3s; }
.connection-lines line:nth-child(3) { animation-delay: 0.45s; }
.connection-lines line:nth-child(4) { animation-delay: 0.6s; }
.connection-lines line:nth-child(5) { animation-delay: 0.75s; }

@keyframes draw-line {
  to {
    stroke-dashoffset: 0;
  }
}

.active-line {
  stroke: #67c23a !important;
  filter: drop-shadow(0 0 4px rgba(103, 194, 58, 0.5));
  opacity: 1;
}

.integration-title {
  font-size: 14px;
  font-weight: 600;
  fill: #303133;
}

.integration-title--name {
  font-size: 16px;
}

.integration-description {
  font-size: 11px;
  fill: #909399;
}

.integration-track {
  transition: opacity 0.2s ease;
  cursor: pointer;
}

.click-hint {
  font-size: 10px;
  fill: #409eff;
  font-weight: 600;
}

.empty-state {
  padding: 60px 0;
}

@media (max-width: 768px) {
  .search-input {
    width: 100%;
  }

  .integration-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
