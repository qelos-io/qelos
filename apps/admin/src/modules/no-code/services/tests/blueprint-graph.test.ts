import { describe, expect, it } from 'vitest';
import { NODE_H, NODE_W, fitTransform, layoutBlueprintGraph, neighboursOf } from '../blueprint-graph';

const bp = (identifier: string, ...targets: string[]) => ({
  identifier,
  name: identifier.toUpperCase(),
  relations: targets.map((target, i) => ({ key: `${target}${i ? i : ''}`, target })),
});
const node = (layout: ReturnType<typeof layoutBlueprintGraph>, id: string) => layout.nodes.find((n) => n.identifier === id)!;

describe('layoutBlueprintGraph', () => {
  it('puts a blueprint to the left of the ones it links to', () => {
    const layout = layoutBlueprintGraph([bp('line', 'invoice'), bp('invoice', 'customer'), bp('customer')]);
    expect(node(layout, 'line').layer).toBe(0);
    expect(node(layout, 'invoice').layer).toBe(1);
    expect(node(layout, 'customer').layer).toBe(2);
    expect(node(layout, 'line').x).toBeLessThan(node(layout, 'invoice').x);
    expect(node(layout, 'invoice').x).toBeLessThan(node(layout, 'customer').x);
  });

  it('puts a blueprint after every blueprint that links to it, even through a longer path', () => {
    const layout = layoutBlueprintGraph([bp('a', 'b', 'c'), bp('b', 'c'), bp('c')]);
    expect(node(layout, 'c').layer).toBe(2);
  });

  it('survives cycles: two-way links get two edges and every layer is defined', () => {
    const layout = layoutBlueprintGraph([bp('todo', 'post'), bp('post', 'todo')]);
    expect(layout.edges).toHaveLength(2);
    expect(layout.edges.filter((edge) => edge.back)).toHaveLength(1);
    expect(new Set(layout.nodes.map((n) => n.layer)).size).toBe(2);
    const [forward, backward] = [layout.edges.find((e) => !e.back)!, layout.edges.find((e) => e.back)!];
    expect(forward.path).not.toBe(backward.path);
  });

  it('draws a loop for a link to itself, above the node', () => {
    const layout = layoutBlueprintGraph([bp('category', 'category'), bp('item', 'category')]);
    const loop = layout.edges.find((edge) => edge.self)!;
    expect(loop.label.y).toBeLessThan(node(layout, 'category').y);
    expect(loop.back).toBe(false);
  });

  it('leaves room above a blueprint with a loop so it never touches the one above', () => {
    const layout = layoutBlueprintGraph([bp('hub', 'category', 'item'), bp('category', 'category'), bp('item')]);
    const loop = layout.edges.find((edge) => edge.self)!;
    const category = node(layout, 'category');
    const sameColumn = layout.nodes.filter((n) => n.x === category.x && n.identifier !== 'category' && n.y < category.y);
    sameColumn.forEach((above) => expect(above.y + NODE_H).toBeLessThanOrEqual(category.y - 40));
    expect(loop.label.y).toBeGreaterThan(0);
  });

  it('ignores links to blueprints that do not exist and repeated keys', () => {
    const layout = layoutBlueprintGraph([
      { identifier: 'a', relations: [{ key: 'x', target: 'ghost' }, { key: 'y', target: 'b' }, { key: 'y', target: 'b' }] },
      { identifier: 'b' },
    ]);
    expect(layout.edges.map((edge) => edge.id)).toEqual(['a:y']);
  });

  it('keeps unlinked blueprints in a block underneath, with a caption', () => {
    const layout = layoutBlueprintGraph([bp('a', 'b'), bp('b'), bp('lonely'), bp('lonelier')]);
    const linked = [node(layout, 'a'), node(layout, 'b')];
    for (const n of [node(layout, 'lonely'), node(layout, 'lonelier')]) {
      expect(n.unlinked).toBe(true);
      expect(n.y).toBeGreaterThan(Math.max(...linked.map((l) => l.y)) + NODE_H);
    }
    expect(layout.unlinkedAt).not.toBeNull();
    expect(layoutBlueprintGraph([bp('x'), bp('y')]).unlinkedAt).toBeNull();
  });

  it('never overlaps nodes and keeps everything inside the reported size', () => {
    const many = [bp('a', 'd', 'e'), bp('b', 'd'), bp('c', 'e', 'f'), bp('d', 'g'), bp('e', 'g'), bp('f'), bp('g'), bp('h'), bp('i')];
    const layout = layoutBlueprintGraph(many);
    layout.nodes.forEach((n, i) => {
      expect(n.x + NODE_W).toBeLessThanOrEqual(layout.width);
      expect(n.y + NODE_H).toBeLessThanOrEqual(layout.height);
      layout.nodes.slice(i + 1).forEach((m) => {
        const apart = n.x + NODE_W <= m.x || m.x + NODE_W <= n.x || n.y + NODE_H <= m.y || m.y + NODE_H <= n.y;
        expect(apart, `${n.identifier} overlaps ${m.identifier}`).toBe(true);
      });
    });
  });

  it('spreads edges that share a side of a node along it', () => {
    const layout = layoutBlueprintGraph([bp('a', 'b', 'c', 'd'), bp('b'), bp('c'), bp('d')]);
    const starts = layout.edges.map((edge) => edge.path.split(' ').slice(1, 3).join(' '));
    expect(new Set(starts).size).toBe(3);
    const a = node(layout, 'a');
    layout.edges.forEach((edge) => {
      const y = Number(edge.path.split(' ')[2]);
      expect(y).toBeGreaterThanOrEqual(a.y);
      expect(y).toBeLessThanOrEqual(a.y + NODE_H);
    });
  });

  it('is deterministic and handles empty input', () => {
    const input = [bp('a', 'b'), bp('b', 'c'), bp('c')];
    expect(layoutBlueprintGraph(input)).toEqual(layoutBlueprintGraph(input));
    expect(layoutBlueprintGraph([])).toMatchObject({ nodes: [], edges: [], unlinkedAt: null });
  });
});

function sample(path: string, steps = 24) {
  const n = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const points: { x: number; y: number }[] = [];
  let [x0, y0] = n;
  for (let i = 2; i + 5 < n.length + 0; i += 6) {
    const [c1x, c1y, c2x, c2y, x3, y3] = n.slice(i, i + 6);
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const u = 1 - t;
      points.push({
        x: u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x3,
        y: u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y3,
      });
    }
    [x0, y0] = [x3, y3];
  }
  return points;
}

describe('long edges', () => {
  const inside = (p: { x: number; y: number }, n: { x: number; y: number }) =>
    p.x > n.x + 1 && p.x < n.x + NODE_W - 1 && p.y > n.y + 1 && p.y < n.y + NODE_H - 1;

  it('never run behind a blueprint they only pass by', () => {
    const cases = [
      [bp('a', 'b', 'd'), bp('b', 'c'), bp('c', 'd'), bp('d')],
      [bp('a', 'b', 'c', 'd'), bp('b', 'c', 'd'), bp('c', 'd'), bp('d')],
      [bp('a', 'b'), bp('b', 'c'), bp('c', 'd'), bp('d', 'a')],
      [bp('x', 'e'), bp('a', 'b'), bp('b', 'c'), bp('c', 'd'), bp('d', 'e'), bp('e')],
    ];
    for (const input of cases) {
      const layout = layoutBlueprintGraph(input);
      for (const edge of layout.edges) {
        const others = layout.nodes.filter((n) => n.identifier !== edge.source && n.identifier !== edge.target);
        for (const point of sample(edge.path)) {
          for (const other of others) expect(inside(point, other), `${edge.id} crosses ${other.identifier}`).toBe(false);
        }
      }
    }
  });

  it('start on the source and end on the target', () => {
    const layout = layoutBlueprintGraph([bp('a', 'b', 'c'), bp('b', 'c'), bp('c')]);
    const edge = layout.edges.find((e) => e.source === 'a' && e.target === 'c')!;
    const points = sample(edge.path);
    const a = node(layout, 'a');
    const c = node(layout, 'c');
    expect(points[0].x).toBeCloseTo(a.x + NODE_W);
    expect(points.at(-1)!.x).toBeCloseTo(c.x);
    expect(edge.label.x).toBeGreaterThan(a.x + NODE_W);
    expect(edge.label.x).toBeLessThan(c.x);
  });
});

describe('neighboursOf and fitTransform', () => {
  it('lists a blueprint and everything linked to or from it', () => {
    const layout = layoutBlueprintGraph([bp('a', 'b'), bp('b'), bp('c', 'a'), bp('d')]);
    expect([...neighboursOf(layout.edges, 'a')].sort()).toEqual(['a', 'b', 'c']);
  });

  it('fits the graph into the viewport without zooming in past 1', () => {
    expect(fitTransform({ width: 400, height: 200 }, { width: 1000, height: 600 })).toMatchObject({ scale: 1 });
    const fitted = fitTransform({ width: 2000, height: 1000 }, { width: 1000, height: 600 });
    expect(fitted.scale).toBeLessThan(0.5);
    expect(fitTransform({ width: 0, height: 0 }, { width: 1000, height: 600 })).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('keeps text readable on small screens: no smaller than minScale, starting at the left to be panned', () => {
    const phone = fitTransform({ width: 1400, height: 700 }, { width: 390, height: 560 }, { minScale: 0.55 });
    expect(phone.scale).toBe(0.55);
    expect(phone.x).toBe(16);
    const roomy = fitTransform({ width: 400, height: 200 }, { width: 1000, height: 600 }, { minScale: 0.55 });
    expect(roomy.x).toBeGreaterThan(100);
  });
});
