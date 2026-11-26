import { MockHttpError } from '../router/router.js';
import type { Doc } from '../state/mock-state.js';
import type { Limitation } from '../blueprints/limitations.js';

export const DEFAULT_LIMIT = 1000;

/** Parse a query string with `qs`-style brackets: `a[b]=1`, `a[]=1&a[]=2`; repeated keys combine into arrays. */
export function parseQuery(search: URLSearchParams): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [rawKey, value] of search) {
    const m = rawKey.match(/^([^[\]]+)((?:\[[^[\]]*\])*)$/);
    const path = m ? [m[1], ...[...m[2].matchAll(/\[([^[\]]*)\]/g)].map((x) => x[1])] : [rawKey];
    if (path.some((p) => p === '__proto__' || p === 'constructor' || p === 'prototype')) continue;
    let node: Record<string, any> | null = out;
    for (let i = 0; i < path.length - 1 && node; i++) {
      const key = path[i];
      if (path[i + 1] === '') {
        (node[key] = Array.isArray(node[key]) ? node[key] : []).push(value);
        node = null;
      } else {
        if (typeof node[key] !== 'object' || node[key] === null || Array.isArray(node[key])) node[key] = {};
        node = node[key];
      }
    }
    if (!node) continue;
    const last = path[path.length - 1];
    if (!(last in node)) node[last] = value;
    else node[last] = [].concat(node[last], value as any);
  }
  return out;
}

/** `$limit`, `$skip` (offset) and `$page` (1-based). `$skip` wins over `$page`; any paging param without `$limit` falls back to DEFAULT_LIMIT. */
export function getPagination(raw: { $limit?: any; $skip?: any; $page?: any }): { limit?: number; skip?: number } {
  const limit = raw.$limit ? parseInt(raw.$limit) || DEFAULT_LIMIT : undefined;
  const hasSkip = raw.$skip !== undefined && raw.$skip !== null && raw.$skip !== '';
  if (hasSkip) return { limit: limit || DEFAULT_LIMIT, skip: Math.max(parseInt(raw.$skip) || 0, 0) };
  if (raw.$page) {
    const page = Math.max(parseInt(raw.$page) || 1, 1);
    const effective = limit || DEFAULT_LIMIT;
    return { limit: effective, skip: (page - 1) * effective };
  }
  return { limit, skip: undefined };
}

export interface BlueprintProperty {
  type?: string;
  required?: boolean;
  multi?: boolean;
  enum?: any[];
  min?: any;
  max?: any;
  [key: string]: any;
}

export interface BlueprintDoc extends Doc {
  identifier: string;
  properties?: Record<string, BlueprintProperty>;
  permissions?: Array<Record<string, any>>;
  permissionScope?: 'user' | 'workspace' | 'tenant';
  relations?: Array<{ key: string; target: string }>;
  entityIdentifierMechanism?: string;
  limitations?: Limitation[];
}

const SYSTEM_FIELDS = new Set(['_id', 'identifier', 'id', 'user', 'workspace', 'tenant', 'blueprint', 'created', 'updated', 'metadata']);

/** The metadata of a stored entity (seeded entities may be stored flat). */
export function metadataOf(entity: Doc, blueprint: BlueprintDoc): Record<string, any> {
  if (entity.metadata && typeof entity.metadata === 'object') return entity.metadata;
  const meta: Record<string, any> = {};
  for (const key of Object.keys(blueprint.properties || {})) if (key in entity) meta[key] = entity[key];
  return meta;
}

export function identifierOf(entity: Doc): string {
  return String(entity.identifier ?? entity._id);
}

function invalid(message: string): never {
  throw new MockHttpError(406, message);
}

/** Mirrors `validateValue` of the no-code service. Returns the normalized value. */
export function validateValue(key: string, value: any, property: BlueprintProperty): any {
  if (value === undefined || value === null) {
    if (property.required) invalid(`Property ${key} is required`);
    return undefined;
  }
  switch (property.type) {
    case 'number':
      if (value === '' || typeof value === 'boolean' || isNaN(value)) invalid(`Property ${key} must be a number`);
      value = Number(value);
      break;
    case 'boolean':
      value = !!value;
      break;
    case 'object':
      if (typeof value !== 'object') invalid(`Property ${key} must be a valid according to schema: ${property.schema?.type || 'object'}`);
      break;
    case 'string':
      if (typeof value !== 'string') invalid(`Property ${key} must be a string`);
      if (property.enum?.length && !property.enum.includes(value)) {
        invalid(`Property ${key} must be one of ${property.enum.join(', ')}`);
      }
      break;
    case 'file':
      if (typeof value !== 'string' || !value.startsWith('http')) invalid(`Property ${key} must be a valid file`);
      break;
    case 'date':
      if (new Date(value).toString() === 'Invalid Date') invalid(`Property ${key} must be a date`);
      value = String(value);
      break;
    case 'datetime':
      if (new Date(value).toString() === 'Invalid Date') invalid(`Property ${key} must be a datetime`);
      value = new Date(value).toISOString();
      break;
    case 'time': {
      const [hours, minutes] = String(value).split(':');
      if (isNaN(parseInt(hours)) || isNaN(parseInt(minutes))) invalid(`Property ${key} must be a time`);
      value = `${hours}:${minutes}`;
      break;
    }
  }
  if (property.min !== undefined && value < property.min) invalid(`Property ${key} must be greater than ${property.min}`);
  if (property.max !== undefined && value > property.max) invalid(`Property ${key} must be less than ${property.max}`);
  return value;
}

/** Validate the full metadata input against the blueprint's properties; unknown keys are dropped. */
export function validateMetadata(input: Record<string, any> | undefined, blueprint: BlueprintDoc): Record<string, any> {
  const valid: Record<string, any> = {};
  for (const [key, property] of Object.entries(blueprint.properties || {})) {
    const value = input?.[key];
    if (property.multi) {
      if (Array.isArray(value)) valid[key] = value.map((v) => validateValue(key, v, property));
      else if (property.required) invalid(`Property ${key} must be an array`);
    } else {
      const v = validateValue(key, value, property);
      if (v !== undefined) valid[key] = v;
    }
  }
  return valid;
}

/** Existing metadata, overlaid by flat top-level properties, overlaid by an explicit `metadata` object. */
export function buildMetadataInput(existing: Record<string, any> | undefined, body: any, blueprint: BlueprintDoc) {
  const { _id, metadata, ...rest } = body || {};
  const flat: Record<string, any> = {};
  for (const key of Object.keys(blueprint.properties || {})) if (key in rest) flat[key] = rest[key];
  return { ...existing, ...flat, ...metadata };
}

const OPERATORS = new Set(['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$regex', '$options', '$exists']);

function isOperatorObject(v: unknown): v is Record<string, any> {
  return !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).some((k) => OPERATORS.has(k));
}

/** Convert query-string values by the blueprint property type (like the real controller). */
function convertByType(value: any, type?: string): any {
  const one = (v: any) => {
    if (typeof v !== 'string') return v;
    if (type === 'number') return parseInt(v);
    if (type === 'datetime') return new Date(v).getTime();
    return v;
  };
  if (type === 'boolean') {
    const b = (v: any) => (typeof v === 'string' ? v.toLowerCase() === 'true' || v === '1' : !!v);
    return Array.isArray(value) ? value.map(b) : b(value);
  }
  if (Array.isArray(value)) return value.map(one);
  if (isOperatorObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, k === '$in' || k === '$nin' ? [].concat(v as any).map(one) : k === '$regex' || k === '$options' || k === '$exists' ? v : one(v)]));
  }
  return one(value);
}

function comparable(v: any, type?: string): any {
  if (type === 'datetime' || v instanceof Date) {
    const t = new Date(v).getTime();
    return isNaN(t) ? v : t;
  }
  return v;
}

function looseEqual(actual: any, expected: any, type?: string): boolean {
  if (actual === undefined || actual === null) return expected === null || expected === undefined;
  if (Array.isArray(actual)) return actual.some((a) => looseEqual(a, expected, type));
  return String(comparable(actual, type)) === String(comparable(expected, type));
}

export function matches(actual: any, cond: any, type?: string): boolean {
  if (Array.isArray(cond)) return cond.some((c) => matches(actual, c, type));
  if (!isOperatorObject(cond)) return looseEqual(actual, cond, type);
  const a = comparable(actual, type);
  for (const [op, expected] of Object.entries(cond)) {
    const e = comparable(expected, type);
    switch (op) {
      case '$eq':
        if (!looseEqual(actual, expected, type)) return false;
        break;
      case '$ne':
        if (looseEqual(actual, expected, type)) return false;
        break;
      case '$gt':
        if (!(a > e)) return false;
        break;
      case '$gte':
        if (!(a >= e)) return false;
        break;
      case '$lt':
        if (!(a < e)) return false;
        break;
      case '$lte':
        if (!(a <= e)) return false;
        break;
      case '$in':
        if (![].concat(expected as any).some((x) => looseEqual(actual, x, type))) return false;
        break;
      case '$nin':
        if ([].concat(expected as any).some((x) => looseEqual(actual, x, type))) return false;
        break;
      case '$exists': {
        const wanted = !(expected === 'false' || expected === '0' || expected === false);
        if ((actual !== undefined && actual !== null) !== wanted) return false;
        break;
      }
      case '$regex': {
        let re: RegExp;
        try {
          re = new RegExp(String(expected), String(cond.$options ?? 'i').replace(/[^imsu]/g, ''));
        } catch {
          return false;
        }
        const list = Array.isArray(actual) ? actual : [actual];
        if (!list.some((x) => typeof x === 'string' && re.test(x))) return false;
        break;
      }
    }
  }
  return true;
}

const RESERVED = new Set(['$populate', '$sort', '$limit', '$page', '$skip', '$outerPopulate', '$flat', '$q', '$qProps', '$select', 'bypassAdmin']);

/** Build a predicate from the query params: property filters (+ operators), system field filters and `$q`. */
export function buildFilter(query: Record<string, any>, blueprint: BlueprintDoc): (entity: Doc) => boolean {
  const props = blueprint.properties || {};
  const checks: Array<(e: Doc) => boolean> = [];
  for (const [key, cond] of Object.entries(query)) {
    if (RESERVED.has(key) || key.startsWith('$')) continue;
    const property = props[key];
    if (property) {
      const converted = convertByType(cond, property.type);
      checks.push((e) => matches(metadataOf(e, blueprint)[key], converted, property.type));
    } else if (key === 'id') {
      checks.push((e) => matches(identifierOf(e), cond));
    } else if (SYSTEM_FIELDS.has(key) || key.startsWith('metadata.')) {
      const meta = key.startsWith('metadata.') ? key.slice(9) : undefined;
      checks.push((e) => matches(meta ? metadataOf(e, blueprint)[meta] : e[key], cond, key === 'created' || key === 'updated' ? 'datetime' : undefined));
    }
  }
  if (query.$q) {
    const re = new RegExp(String(query.$q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const searchProps = query.$qProps
      ? String(query.$qProps).split(',')
      : Object.keys(props)
          .filter((k) => props[k].type === 'string' && props[k].required)
          .slice(0, 3);
    if (searchProps.length) {
      checks.push((e) => {
        const meta = metadataOf(e, blueprint);
        return searchProps.some((p) => typeof meta[p] === 'string' && re.test(meta[p]));
      });
    }
  }
  return (e) => checks.every((c) => c(e));
}

/** `$sort=-price,name` (comma or space separated, `-` prefix = descending). Defaults to `created`. */
export function buildSorter(sort: any, blueprint: BlueprintDoc): (a: Doc, b: Doc) => number {
  const tokens = (Array.isArray(sort) ? sort.join(' ') : String(sort || 'created')).split(/[\s,]+/).filter(Boolean);
  const keys = tokens.map((t) => ({ desc: t.startsWith('-'), key: t.replace(/^[-+]/, '') }));
  const read = (e: Doc, key: string) => {
    const name = key.startsWith('metadata.') ? key.slice(9) : key;
    const v = blueprint.properties?.[name] ? metadataOf(e, blueprint)[name] : e[name];
    return v instanceof Date ? v.getTime() : v;
  };
  return (a, b) => {
    for (const { desc, key } of keys) {
      const x = read(a, key);
      const y = read(b, key);
      if (x === y) continue;
      if (x === undefined || x === null) return desc ? 1 : -1;
      if (y === undefined || y === null) return desc ? -1 : 1;
      const cmp = x < y ? -1 : 1;
      return desc ? -cmp : cmp;
    }
    return 0;
  };
}
