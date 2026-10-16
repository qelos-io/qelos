export interface GraphBlueprint {
  identifier: string;
  name?: string;
  relations?: { key: string; target: string }[];
}

export const NODE_W = 184;
export const NODE_H = 66;
const GAP_X = 96;
const GAP_Y = 30;
const MARGIN = 36;
const PORT_PAD = 12;
const LOOP_H = 34;
/** height of the slot a long edge reserves in each layer it passes through */
const LANE_H = 14;
/** room above a blueprint that links to itself, for the loop */
const LOOP_ROOM = 44;

export interface GraphNode {
  identifier: string;
  name: string;
  x: number;
  y: number;
  layer: number;
  /** nothing links to it and it links to nothing */
  unlinked: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  key: string;
  /** SVG path from the border of the source to the border of the target */
  path: string;
  /** where the property name is drawn */
  label: { x: number; y: number };
  self: boolean;
  /** points back towards an earlier layer (part of a cycle) */
  back: boolean;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  /** where the "not linked" caption goes, when there are unlinked blueprints */
  unlinkedAt: { x: number; y: number } | null;
}

interface RawEdge {
  source: string;
  target: string;
  key: string;
}

/** Edges that close a cycle, found by depth-first search. They are drawn, but do not decide the layers. */
function findBackEdges(ids: string[], edges: RawEdge[]): Set<RawEdge> {
  const out = new Map<string, RawEdge[]>(ids.map((id) => [id, []]));
  edges.forEach((edge) => out.get(edge.source)!.push(edge));
  const state = new Map<string, 'open' | 'done'>();
  const back = new Set<RawEdge>();
  const visit = (id: string) => {
    state.set(id, 'open');
    for (const edge of out.get(id)!) {
      const next = state.get(edge.target);
      if (next === 'open') back.add(edge);
      else if (!next) visit(edge.target);
    }
    state.set(id, 'done');
  };
  ids.forEach((id) => !state.has(id) && visit(id));
  return back;
}

/**
 * Lays blueprints out left to right: a blueprint sits to the left of the ones it links to,
 * so arrows mostly flow rightwards. Blueprints with no links go in a block underneath.
 */
export function layoutBlueprintGraph(blueprints: GraphBlueprint[]): GraphLayout {
  const known = new Set(blueprints.map((blueprint) => blueprint.identifier));
  const seen = new Set<string>();
  const raw: RawEdge[] = [];
  for (const blueprint of blueprints) {
    for (const relation of blueprint.relations || []) {
      const id = `${blueprint.identifier}\u0000${relation.key}`;
      if (!known.has(relation.target) || seen.has(id)) continue;
      seen.add(id);
      raw.push({ source: blueprint.identifier, target: relation.target, key: relation.key });
    }
  }

  const linked = new Set<string>();
  raw.forEach((edge) => {
    linked.add(edge.source);
    linked.add(edge.target);
  });
  const linkedIds = blueprints.map((blueprint) => blueprint.identifier).filter((id) => linked.has(id));
  const unlinkedIds = blueprints.map((blueprint) => blueprint.identifier).filter((id) => !linked.has(id));

  const flow = raw.filter((edge) => edge.source !== edge.target);
  const back = findBackEdges(linkedIds, flow);
  const forwardEdges = flow.filter((edge) => !back.has(edge));

  // longest path from the blueprints nothing points away from
  const layer = new Map<string, number>(linkedIds.map((id) => [id, 0]));
  for (let pass = 0; pass < linkedIds.length; pass++) {
    let changed = false;
    for (const edge of forwardEdges) {
      const wanted = layer.get(edge.source)! + 1;
      if (layer.get(edge.target)! < wanted) {
        layer.set(edge.target, wanted);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const layerCount = linkedIds.length ? Math.max(...linkedIds.map((id) => layer.get(id)!)) + 1 : 0;
  const columns: string[][] = Array.from({ length: layerCount }, () => []);
  linkedIds.forEach((id) => columns[layer.get(id)!].push(id));

  // Edges that skip layers get a reserved slot (a "lane") in every layer they cross, so they
  // route through free space instead of behind the blueprints in between.
  type Item = { id: string; h: number; top?: number };
  const chains = new Map<RawEdge, string[]>();
  const withLoop = new Set(raw.filter((edge) => edge.source === edge.target).map((edge) => edge.source));
  const items: Item[][] = columns.map((column) =>
    column.map((id) => (withLoop.has(id) ? { id, h: NODE_H + LOOP_ROOM, top: LOOP_ROOM } : { id, h: NODE_H })),
  );
  flow.forEach((edge, edgeIndex) => {
    const isBack = back.has(edge);
    const lo = isBack ? edge.target : edge.source;
    const hi = isBack ? edge.source : edge.target;
    const chain = [lo];
    for (let l = layer.get(lo)! + 1; l < layer.get(hi)!; l++) {
      const id = `~lane${edgeIndex}~${l}`;
      chain.push(id);
      items[l].push({ id, h: LANE_H });
    }
    chain.push(hi);
    chains.set(edge, chain);
  });

  // order each column by the average position of its neighbours, a few sweeps to cut crossings
  const rank = new Map<string, number>();
  const around = new Map<string, string[]>();
  chains.forEach((chain) => {
    for (let i = 0; i < chain.length - 1; i++) {
      around.set(chain[i], [...(around.get(chain[i]) || []), chain[i + 1]]);
      around.set(chain[i + 1], [...(around.get(chain[i + 1]) || []), chain[i]]);
    }
  });
  const setRanks = () => items.forEach((column) => column.forEach((item, index) => rank.set(item.id, index)));
  setRanks();
  for (let sweep = 0; sweep < 6; sweep++) {
    const order = sweep % 2 === 0 ? items : [...items].reverse();
    for (const column of order) {
      const score = (id: string) => {
        const next = around.get(id) || [];
        return next.length ? next.reduce((sum, other) => sum + rank.get(other)!, 0) / next.length : rank.get(id)!;
      };
      column.sort((a, b) => score(a.id) - score(b.id) || rank.get(a.id)! - rank.get(b.id)!);
      column.forEach((item, index) => rank.set(item.id, index));
    }
  }

  const columnHeight = (column: Item[]) => column.reduce((sum, item) => sum + item.h, 0) + Math.max(0, column.length - 1) * GAP_Y;
  const blockHeight = Math.max(NODE_H, ...items.map(columnHeight));
  const position = new Map<string, { x: number; y: number }>();
  const laneAt = new Map<string, { x: number; y: number }>();
  items.forEach((column, index) => {
    let y = MARGIN + (blockHeight - columnHeight(column)) / 2;
    const x = MARGIN + index * (NODE_W + GAP_X);
    column.forEach((item) => {
      if (item.id.startsWith('~lane')) laneAt.set(item.id, { x: x + NODE_W / 2, y: y + item.h / 2 });
      else position.set(item.id, { x, y: y + (item.top || 0) });
      y += item.h + GAP_Y;
    });
  });

  const graphWidth = layerCount ? layerCount * NODE_W + (layerCount - 1) * GAP_X : 0;
  const graphBottom = layerCount ? MARGIN + blockHeight : MARGIN;
  const perRow = Math.max(3, layerCount || 3);
  const unlinkedTop = graphBottom + (layerCount ? 72 : 0);
  unlinkedIds.forEach((id, index) => {
    position.set(id, {
      x: MARGIN + (index % perRow) * (NODE_W + GAP_X * 0.4),
      y: unlinkedTop + Math.floor(index / perRow) * (NODE_H + GAP_Y * 0.6),
    });
  });

  // The route of an edge, as the ids it passes through from its source to its target
  // (lanes in between, when it crosses layers).
  const route = (edge: RawEdge) => (back.has(edge) ? [...chains.get(edge)!].reverse() : chains.get(edge)!);
  const centreY = (id: string) => (laneAt.has(id) ? laneAt.get(id)!.y : position.get(id)!.y + NODE_H / 2);

  // ports: edges that share a side of a node are spread along it, ordered by where the next point of the route is
  const slots = new Map<string, { edge: RawEdge; role: 'out' | 'in'; other: string }[]>();
  const slot = (id: string, side: string, entry: { edge: RawEdge; role: 'out' | 'in'; other: string }) => {
    const bucket = `${id}|${side}`;
    slots.set(bucket, [...(slots.get(bucket) || []), entry]);
  };
  flow.forEach((edge) => {
    const path = route(edge);
    const isBack = back.has(edge);
    slot(edge.source, isBack ? 'left' : 'right', { edge, role: 'out', other: path[1] });
    slot(edge.target, isBack ? 'right' : 'left', { edge, role: 'in', other: path[path.length - 2] });
  });
  const portY = new Map<string, number>();
  slots.forEach((entries, bucket) => {
    const id = bucket.split('|')[0];
    entries.sort((a, b) => centreY(a.other) - centreY(b.other) || a.edge.key.localeCompare(b.edge.key));
    entries.forEach((entry, index) => {
      const span = NODE_H - PORT_PAD * 2;
      const y = entries.length === 1 ? NODE_H / 2 : PORT_PAD + (span * index) / (entries.length - 1);
      portY.set(`${entry.edge.source}|${entry.edge.key}|${entry.role}`, position.get(id)!.y + y);
    });
  });

  type Point = { x: number; y: number };
  const curve = (from: Point, to: Point) => {
    const dx = (to.x - from.x) / 2;
    const reach = Math.abs(dx) < 36 ? Math.sign(dx || 1) * 36 : dx;
    return `C ${from.x + reach} ${from.y}, ${to.x - reach} ${to.y}, ${to.x} ${to.y}`;
  };

  const edges: GraphEdge[] = raw.map((edge) => {
    const id = `${edge.source}:${edge.key}`;
    const from = position.get(edge.source)!;
    if (edge.source === edge.target) {
      const x1 = from.x + NODE_W * 0.62;
      const x2 = from.x + NODE_W * 0.38;
      const top = from.y;
      return {
        id,
        source: edge.source,
        target: edge.target,
        key: edge.key,
        path: `M ${x1} ${top} C ${x1} ${top - LOOP_H * 1.6}, ${x2} ${top - LOOP_H * 1.6}, ${x2} ${top}`,
        label: { x: from.x + NODE_W / 2, y: top - LOOP_H * 1.2 },
        self: true,
        back: false,
      };
    }
    const to = position.get(edge.target)!;
    const isBack = back.has(edge);
    const steps = route(edge);
    const points: Point[] = [{ x: isBack ? from.x : from.x + NODE_W, y: portY.get(`${edge.source}|${edge.key}|out`)! }];
    const lanes: Point[] = [];
    steps.slice(1, -1).forEach((step) => {
      const lane = laneAt.get(step)!;
      lanes.push(lane);
      // straight through the column, clear of the blueprints above and below the lane
      const enter = { x: lane.x + (isBack ? NODE_W / 2 : -NODE_W / 2), y: lane.y };
      const leave = { x: lane.x + (isBack ? -NODE_W / 2 : NODE_W / 2), y: lane.y };
      points.push(enter, leave);
    });
    points.push({ x: isBack ? to.x + NODE_W : to.x, y: portY.get(`${edge.source}|${edge.key}|in`)! });

    const path = `M ${points[0].x} ${points[0].y} ${points
      .slice(1)
      .map((point, index) => curve(points[index], point))
      .join(' ')}`;
    let label: Point;
    if (lanes.length) {
      label = lanes[Math.floor(lanes.length / 2)];
    } else {
      const [a, b] = points;
      const dx = Math.max(36, Math.abs(b.x - a.x) / 2) * (b.x >= a.x ? 1 : -1);
      const c1 = a.x + dx;
      const c2 = b.x - dx;
      label = { x: (a.x + 3 * c1 + 3 * c2 + b.x) / 8, y: (a.y + 3 * a.y + 3 * b.y + b.y) / 8 };
    }
    return { id, source: edge.source, target: edge.target, key: edge.key, path, label, self: false, back: isBack };
  });

  const nodes: GraphNode[] = blueprints.map((blueprint) => ({
    identifier: blueprint.identifier,
    name: blueprint.name || blueprint.identifier,
    x: position.get(blueprint.identifier)!.x,
    y: position.get(blueprint.identifier)!.y,
    layer: layer.get(blueprint.identifier) ?? -1,
    unlinked: !linked.has(blueprint.identifier),
  }));

  const unlinkedRows = Math.ceil(unlinkedIds.length / perRow);
  const unlinkedBottom = unlinkedIds.length ? unlinkedTop + unlinkedRows * (NODE_H + GAP_Y * 0.6) : 0;
  const width = Math.max(MARGIN * 2 + graphWidth, unlinkedIds.length ? MARGIN * 2 + Math.min(unlinkedIds.length, perRow) * (NODE_W + GAP_X * 0.4) : 0);
  const height = Math.max(graphBottom + MARGIN, unlinkedBottom + MARGIN);

  return {
    nodes,
    edges,
    width,
    height,
    unlinkedAt: unlinkedIds.length && layerCount ? { x: MARGIN, y: unlinkedTop - 28 } : null,
  };
}

/** The ids a blueprint is directly connected to, either way. */
export function neighboursOf(edges: GraphEdge[], identifier: string): Set<string> {
  const set = new Set<string>([identifier]);
  edges.forEach((edge) => {
    if (edge.source === identifier) set.add(edge.target);
    if (edge.target === identifier) set.add(edge.source);
  });
  return set;
}

/**
 * Scale and offset that fit the whole graph into a viewport, never zooming in past 1.
 * When fitting would make the text unreadable (`minScale`), it stays larger and starts at the left, to be panned.
 */
export function fitTransform(
  layout: Pick<GraphLayout, 'width' | 'height'>,
  viewport: { width: number; height: number },
  { padding = 16, minScale = 0.2 }: { padding?: number; minScale?: number } = {},
) {
  if (!layout.width || !layout.height || !viewport.width || !viewport.height) return { scale: 1, x: 0, y: 0 };
  const fitted = Math.min(1, (viewport.width - padding * 2) / layout.width, (viewport.height - padding * 2) / layout.height);
  const scale = Math.max(minScale, fitted);
  const overflowsX = layout.width * scale > viewport.width - padding * 2;
  return {
    scale,
    x: overflowsX ? padding : (viewport.width - layout.width * scale) / 2,
    y: Math.max(padding, (viewport.height - layout.height * scale) / 2),
  };
}
