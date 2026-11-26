import { MockHttpError } from '../router/router.js';
import type { Doc } from '../state/mock-state.js';
import { identifierOf, matches, metadataOf, type BlueprintDoc } from './entities-query.js';

/**
 * The aggregations of `GET /api/blueprints/:blueprint/charts/*`, following `apps/no-code/server/controllers/charts.ts`.
 */

const SYSTEM_FIELDS = new Set(['user', 'workspace', 'identifier', 'created', 'updated', 'blueprint', 'tenant']);
const COMPARISONS = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte'];

/** a property compared the way the service converts the query: by the property's type */
function matchesProperty(value: unknown, condition: any, type: string | undefined): boolean {
  if (type === 'boolean') return value === (String(condition).toLowerCase() === 'true' || condition === '1');
  if (type === 'datetime') return matches(value, condition, 'datetime');
  if (type === 'number') {
    if (typeof condition === 'string') return value === parseInt(condition);
    if (condition && typeof condition === 'object' && COMPARISONS.some((operator) => operator in condition)) {
      return matches(value, Object.fromEntries(Object.entries(condition).map(([operator, v]) => [operator, parseInt(String(v))])), 'number');
    }
  }
  // plain text matches a stored text, or a list holding it
  if (typeof condition === 'string') return ([] as unknown[]).concat(value).includes(condition);
  return matches(value, condition);
}

/** The filters of a chart request. `parameters` are the chart's own (like `x`), which are not filters. */
export function chartFilter(query: Record<string, any>, blueprint: BlueprintDoc, parameters: string[] = []): (entity: Doc) => boolean {
  const checks = Object.entries(query)
    .filter(([key]) => !parameters.includes(key) && key !== 'bypassAdmin' && !key.startsWith('$'))
    .map(([key, condition]) => (entity: Doc) => {
      // a property filters by its name or as `metadata.<name>`
      const name = key.startsWith('metadata.') ? key.slice('metadata.'.length) : blueprint.properties?.[key] ? key : undefined;
      if (name !== undefined) return matchesProperty(metadataOf(entity, blueprint)[name], condition, blueprint.properties?.[name]?.type);
      if (!SYSTEM_FIELDS.has(key)) return false;
      const value = key === 'identifier' ? identifierOf(entity) : entity[key];
      return matches(value, condition, key === 'created' || key === 'updated' ? 'datetime' : undefined);
    });
  return (entity) => checks.every((check) => check(entity));
}

/** the property of a query parameter; 400 with the service's message when the blueprint has no such property */
function property(blueprint: BlueprintDoc, name: string | undefined, missing: string) {
  const found = name ? blueprint.properties?.[name] : undefined;
  if (!name || !found?.type) throw new MockHttpError(400, missing);
  return { name, type: found.type as string, title: found.title as string | undefined };
}

/** what an entity is counted under: dates by day of the week (1 = Sunday), times by hour */
function groupKey(value: any, type: string): unknown {
  if (value === undefined || value === null) return null;
  if (type === 'date' || type === 'datetime') return new Date(value).getUTCDay() + 1;
  if (type === 'time') return new Date(value).getUTCHours();
  return value;
}

/** entities grouped by a property, sorted by the group: empty values first */
function groups(entities: Doc[], blueprint: BlueprintDoc, name: string, type: string): Array<{ key: any; entities: Doc[] }> {
  const found = new Map<string, { key: any; entities: Doc[] }>();
  for (const entity of entities) {
    const key = groupKey(metadataOf(entity, blueprint)[name], type);
    const id = JSON.stringify(key);
    if (!found.has(id)) found.set(id, { key, entities: [] });
    found.get(id)!.entities.push(entity);
  }
  return [...found.values()].sort((a, b) => {
    if (a.key === b.key) return 0;
    if (a.key === null) return -1;
    if (b.key === null) return 1;
    return a.key < b.key ? -1 : 1;
  });
}

function aggregated(entities: Doc[], blueprint: BlueprintDoc, x: string | undefined) {
  const { name, type, title } = property(blueprint, x, 'xAxis is required');
  if (type === 'object') throw new MockHttpError(400, 'cannot aggregate objects');
  return { title, data: groups(entities, blueprint, name, type).map(({ key, entities }) => ({ key, count: entities.length })) };
}

export function pieChart(entities: Doc[], blueprint: BlueprintDoc, x: string | undefined) {
  const { title, data } = aggregated(entities, blueprint, x);
  const label = (key: unknown) => String(key ?? 'Unknown');
  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'inline-start', data: data.map((d) => label(d.key)) },
    series: [
      {
        name: title,
        type: 'pie',
        radius: '50%',
        avoidLabelOverlap: false,
        data: data.map((d) => ({ value: d.count, name: label(d.key) })),
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.2)' } },
      },
    ],
  };
}

export function standardChart(entities: Doc[], blueprint: BlueprintDoc, x: string | undefined, chartType: string) {
  const { data } = aggregated(entities, blueprint, x);
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', label: { show: true } } },
    toolbox: { show: true, feature: { saveAsImage: { show: true } } },
    xAxis: { type: 'category', data: data.map((d) => d.key) },
    yAxis: { type: 'value' },
    series: [{ data: data.map((d) => d.count), type: chartType, showBackground: true }],
  };
}

export function sumCard(entities: Doc[], blueprint: BlueprintDoc, sum: string | undefined, groupBy: string | undefined) {
  const summed = property(blueprint, sum, 'sum property is required');
  if (summed.type !== 'number') throw new MockHttpError(400, 'sum property must be of type number');
  const total = (list: Doc[]) => list.reduce((all, entity) => all + (Number(metadataOf(entity, blueprint)[summed.name]) || 0), 0);
  if (!groupBy) return { sum: total(entities) };
  const by = property(blueprint, groupBy, 'groupBy property not found');
  if (by.type === 'object') throw new MockHttpError(400, 'cannot group by objects');
  const data = groups(entities, blueprint, by.name, by.type).map(({ key, entities }) => ({ group: key, sum: total(entities) }));
  return { groups: data, sum: data.reduce((all, group) => all + group.sum, 0) };
}
