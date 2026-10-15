import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Edge, Node } from '@vue-flow/core';
import { useIntegrationsStore } from './integrations';
import { useIntegrationSourcesStore } from './integration-sources';
import { buildFlowGraph, diagnose, flowOf, relationsOf, standaloneIds, subgraph, type FlowGraph, type FlowIntegration, type FlowNodeData } from '../services/flow-graph';
import { layoutFlow } from '../services/flow-layout';

/**
 * The integrations as a flow: which ones start which. The graph and its layout are derived from the integrations
 * and connections stores; this store only adds what the canvas itself remembers (selection and what is shown).
 */
export const useFlowCanvasStore = defineStore('flow-canvas', () => {
  const integrationsStore = useIntegrationsStore();
  const sourcesStore = useIntegrationSourcesStore();

  const selectedId = ref<string | null>(null);
  /** ids that pass the filters of the automations toolbar; null means everything */
  const allowedIds = ref<Set<string> | null>(null);
  const showStandalone = ref(true);
  const showMinimap = ref(false);

  const sourcesById = computed(() => Object.fromEntries((sourcesStore.result || []).map((source: any) => [source._id, source])));
  const graph = computed<FlowGraph>(() => buildFlowGraph((integrationsStore.integrations || []) as FlowIntegration[], sourcesById.value));
  const standalone = computed(() => standaloneIds(graph.value));

  const visible = computed<FlowGraph>(() => {
    const allowed = allowedIds.value;
    const linkedIntegrations = graph.value.nodes.filter((node) => node.type === 'integration' && (!allowed || allowed.has(node.id)) && (showStandalone.value || !standalone.value.has(node.id)));
    const keep = new Set(linkedIntegrations.map((node) => node.id));
    // an event node stays while something it starts is still visible
    const eventsKept = new Set(graph.value.edges.filter((edge) => edge.from.startsWith('event:') && keep.has(edge.to)).map((edge) => edge.from));
    return subgraph(graph.value, (node) => keep.has(node.id) || eventsKept.has(node.id));
  });

  const positions = computed(() => layoutFlow(visible.value));
  const highlighted = computed(() => (selectedId.value ? flowOf(visible.value, selectedId.value) : null));

  const nodes = computed<Node<FlowNodeData>[]>(() =>
    visible.value.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: positions.value[node.id] || { x: 0, y: 0 },
      data: node,
      selected: node.id === selectedId.value,
      class: highlighted.value && !highlighted.value.has(node.id) ? 'dim' : '',
    })),
  );

  const edges = computed<Edge[]>(() =>
    visible.value.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.signature.eventName,
      data: edge.signature,
      markerEnd: 'arrowclosed',
      class: highlighted.value && !(highlighted.value.has(edge.from) && highlighted.value.has(edge.to)) ? 'dim' : '',
    })),
  );

  const selected = computed(() => graph.value.nodes.find((node) => node.id === selectedId.value) || null);
  const relations = computed(() => (selectedId.value ? relationsOf(graph.value, selectedId.value) : { triggeredBy: [], triggers: [] }));
  const nodeById = (id: string) => graph.value.nodes.find((node) => node.id === id);
  const problems = computed(() => diagnose(graph.value));

  const select = (id: string | null) => (selectedId.value = id === selectedId.value ? null : id);

  return { selectedId, allowedIds, showStandalone, showMinimap, graph, visible, nodes, edges, selected, relations, problems, standalone, nodeById, select };
});
