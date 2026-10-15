import type { FlowGraph } from './flow-graph';

export interface LayoutOptions {
  columnWidth: number;
  rowHeight: number;
  /** columns used for the grid of nodes that take part in no link */
  gridColumns: number;
  gap: number;
}

export const DEFAULT_LAYOUT: LayoutOptions = { columnWidth: 360, rowHeight: 210, gridColumns: 3, gap: 80 };

export type Positions = Record<string, { x: number; y: number }>;

/**
 * Left-to-right layered layout. Linked nodes are layered by the longest path from a starting point and ordered inside
 * a layer by the average position of their parents, which keeps most edges from crossing. Nodes with no links are laid
 * out in a compact grid underneath. Cycles are cut where they close, so every graph gets a layout.
 */
export function layoutFlow(graph: FlowGraph, options: Partial<LayoutOptions> = {}): Positions {
  const { columnWidth, rowHeight, gridColumns, gap } = { ...DEFAULT_LAYOUT, ...options };
  const linked = new Set(graph.edges.flatMap((edge) => [edge.from, edge.to]));
  const connected = graph.nodes.filter((node) => linked.has(node.id)).map((node) => node.id);
  const standalone = graph.nodes.filter((node) => !linked.has(node.id)).map((node) => node.id);

  const children = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const id of connected) {
    children.set(id, []);
    parents.set(id, []);
  }
  for (const edge of graph.edges) {
    children.get(edge.from)?.push(edge.to);
    parents.get(edge.to)?.push(edge.from);
  }

  // layer = longest path from a start; edges that would close a cycle are ignored while walking
  const layer = new Map<string, number>();
  const visiting = new Set<string>();
  const depth = (id: string): number => {
    if (layer.has(id)) return layer.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const value = Math.max(-1, ...(parents.get(id) || []).filter((parent) => !visiting.has(parent)).map(depth)) + 1;
    visiting.delete(id);
    layer.set(id, value);
    return value;
  };
  connected.forEach(depth);

  const layers: string[][] = [];
  for (const id of connected) (layers[layer.get(id)!] ||= []).push(id);

  const row = new Map<string, number>();
  layers.forEach((ids, index) => {
    if (index > 0) {
      const barycenter = (id: string) => {
        const placed = (parents.get(id) || []).filter((parent) => row.has(parent) && layer.get(parent)! < index);
        return placed.length ? placed.reduce((sum, parent) => sum + row.get(parent)!, 0) / placed.length : Number.MAX_SAFE_INTEGER;
      };
      ids.sort((a, b) => barycenter(a) - barycenter(b));
    }
    ids.forEach((id, position) => row.set(id, position));
  });

  const positions: Positions = {};
  let height = 0;
  layers.forEach((ids, index) => {
    ids.forEach((id) => {
      positions[id] = { x: index * columnWidth, y: row.get(id)! * rowHeight };
    });
    height = Math.max(height, ids.length * rowHeight);
  });

  const top = connected.length ? height + gap : 0;
  standalone.forEach((id, index) => {
    positions[id] = { x: (index % gridColumns) * columnWidth, y: top + Math.floor(index / gridColumns) * rowHeight };
  });

  return positions;
}
