import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Edge, Node } from '@vue-flow/core';
import { ElMessage, ElMessageBox } from 'element-plus';
import { translate } from '@/plugins/i18n';
import integrationsService from '@/services/apis/integrations-service';
import { useIntegrationsStore } from './integrations';
import { useIntegrationSourcesStore } from './integration-sources';
import { buildFlowGraph, diagnose, flowOf, relationsOf, standaloneIds, subgraph, type FlowGraph, type FlowIntegration, type FlowNodeData } from '../services/flow-graph';
import { layoutFlow } from '../services/flow-layout';
import { inverseUpdates, planConnect, planDisconnect, type FullIntegration, type IntegrationUpdate, type LinkRefusal } from '../services/flow-links';

/**
 * The integrations as a flow: which ones start which. The graph and its layout are derived from the integrations
 * and connections stores; this store only adds what the canvas itself remembers (selection and what is shown).
 */
export const useFlowCanvasStore = defineStore('flow-canvas', () => {
  const integrationsStore = useIntegrationsStore();
  const sourcesStore = useIntegrationSourcesStore();

  const t = translate;

  const selectedId = ref<string | null>(null);
  const selectedEdgeId = ref<string | null>(null);
  /** the last change the canvas made, so it can be undone */
  const lastChange = ref<{ label: string; undo: IntegrationUpdate[] } | null>(null);
  const busy = ref(false);
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
  const selectedEdge = computed(() => graph.value.edges.find((edge) => edge.id === selectedEdgeId.value) || null);
  const highlighted = computed(() => {
    if (selectedEdge.value) return new Set([selectedEdge.value.from, selectedEdge.value.to]);
    return selectedId.value ? flowOf(visible.value, selectedId.value) : null;
  });

  const nodes = computed<Node<FlowNodeData>[]>(() =>
    visible.value.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: positions.value[node.id] || { x: 0, y: 0 },
      data: node,
      selected: node.id === selectedId.value,
      connectable: true,
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
      selected: edge.id === selectedEdgeId.value,
      class: highlighted.value && !(highlighted.value.has(edge.from) && highlighted.value.has(edge.to)) ? 'dim' : '',
    })),
  );

  const selected = computed(() => graph.value.nodes.find((node) => node.id === selectedId.value) || null);
  const relations = computed(() => (selectedId.value ? relationsOf(graph.value, selectedId.value) : { triggeredBy: [], triggers: [] }));
  const nodeById = (id: string) => graph.value.nodes.find((node) => node.id === id);
  const problems = computed(() => diagnose(graph.value));

  const select = (id: string | null) => {
    selectedEdgeId.value = null;
    selectedId.value = id === selectedId.value ? null : id;
  };

  const selectEdge = (id: string | null) => {
    selectedId.value = null;
    selectedEdgeId.value = id === selectedEdgeId.value ? null : id;
  };

  // ---- building: every change is a handful of updates to integrations, and can be undone ----
  const list = computed(() => (integrationsStore.integrations || []) as FullIntegration[]);

  const refusal: Record<LinkRefusal, string> = {
    'same-node': 'An integration cannot start itself.',
    'cannot-listen': 'This integration is started in another way (not by an event), so an event cannot start it.',
    'already-linked': 'These two are already linked.',
    'unknown-node': 'That integration no longer exists.',
  };

  /** What it would take to link two nodes; null when it cannot be done (the reason is shown). */
  function planLink(fromNodeId: string, toId: string) {
    const from = fromNodeId.startsWith('event:') ? graph.value.nodes.find((node) => node.id === fromNodeId) : null;
    const plan = planConnect(list.value, from?.type === 'event' ? { event: from.signature } : { integrationId: fromNodeId }, toId, sourcesById.value);
    if (!plan.ok) {
      ElMessage.warning(t(refusal[plan.reason]));
      return null;
    }
    return plan;
  }

  async function commit(updates: IntegrationUpdate[], label: string) {
    if (busy.value || !updates.length) return false;
    busy.value = true;
    const undo = inverseUpdates(list.value, updates);
    const done: IntegrationUpdate[] = [];
    try {
      for (const update of updates) {
        await integrationsService.update(update.id, update.body as any);
        done.push(update);
      }
      lastChange.value = { label, undo };
      ElMessage.success(label);
      return true;
    } catch (error: any) {
      // put back what was already written, so a half-applied link never stays behind
      for (const update of inverseUpdates(list.value, done)) await integrationsService.update(update.id, update.body as any).catch(() => undefined);
      ElMessage.error(error?.response?.data?.message || t('Could not change the integrations.'));
      return false;
    } finally {
      await integrationsStore.retry();
      busy.value = false;
    }
  }

  const nameOf = (id: string) => {
    const node = graph.value.nodes.find((entry) => entry.id === id);
    return node?.type === 'integration' ? node.name : node?.type === 'event' ? node.signature.eventName : id;
  };

  async function connect(fromNodeId: string, toId: string) {
    const plan = planLink(fromNodeId, toId);
    if (!plan) return false;
    if (plan.replaces) {
      try {
        await ElMessageBox.confirm(t('{name} reacts to “{from}” today. It will react to “{to}” instead.', { name: nameOf(toId), from: plan.replaces.eventName, to: plan.signature.eventName }), t('Change what starts this integration?'), {
          type: 'warning',
          confirmButtonText: t('Change'),
          cancelButtonText: t('Cancel'),
        });
      } catch {
        return false;
      }
    }
    return commit(plan.updates, t('{from} now starts {to}', { from: nameOf(fromNodeId), to: nameOf(toId) }));
  }

  async function disconnect(edgeId: string) {
    const edge = graph.value.edges.find((entry) => entry.id === edgeId);
    if (!edge) return false;
    const plan = planDisconnect(list.value, edge, sourcesById.value);
    if (!plan) {
      ElMessage.warning(t('This integration cannot be unlinked here. Change its trigger in the editor.'));
      return false;
    }
    try {
      await ElMessageBox.confirm(
        t('{name} will stop reacting to “{event}”. It will wait for “{fresh}” instead, which nothing sends yet.', { name: nameOf(edge.to), event: edge.signature.eventName, fresh: plan.signature.eventName }),
        t('Disconnect these integrations?'),
        { type: 'warning', confirmButtonText: t('Disconnect'), cancelButtonText: t('Cancel') },
      );
    } catch {
      return false;
    }
    selectedEdgeId.value = null;
    return commit(plan.updates, t('{from} no longer starts {to}', { from: nameOf(edge.from), to: nameOf(edge.to) }));
  }

  async function undo() {
    const change = lastChange.value;
    if (!change || busy.value) return;
    lastChange.value = null;
    busy.value = true;
    try {
      for (const update of change.undo) await integrationsService.update(update.id, update.body as any);
      ElMessage.success(t('Undone'));
    } catch {
      ElMessage.error(t('Could not undo the change.'));
    } finally {
      await integrationsStore.retry();
      busy.value = false;
    }
  }

  return { selectedId, selectedEdgeId, selectedEdge, lastChange, busy, planLink, connect, disconnect, undo, selectEdge, allowedIds, showStandalone, showMinimap, graph, visible, nodes, edges, selected, relations, problems, standalone, nodeById, select };
});
