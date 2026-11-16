import mongoose from 'mongoose';
import Script from '../models/script';
import Component from '../models/component';
import logger from '../services/logger';
import { inferType, type ItemType } from '../services/script-types';
import {
  createScript, updateScript, removeScript, getSingleScript, upsertScriptsBulk,
} from './scripts';
import {
  createComponent, updateComponent, removeComponent, getSingleComponent, upsertComponentsBulk,
} from './components';

const withType = (body: any, type: ItemType) => {
  const plain = body?.toJSON ? body.toJSON() : body;
  return plain && typeof plain === 'object' && plain.identifier ? { ...plain, type } : plain;
};

/** Wraps `res` so successful json bodies carry the item type; everything else passes through. */
const typed = (res: any, type: ItemType) => new Proxy(res, {
  get(target, key) {
    if (key === 'json') return (body: any) => target.json(withType(body, type));
    const value = target[key];
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

/** Finds which collection an id belongs to. */
const typeOfId = async (id: string, tenant: string): Promise<ItemType | null> => {
  if (!mongoose.isValidObjectId(id)) return null;
  const query = { _id: id, tenant };
  if (await Script.exists(query)) return 'script';
  if (await Component.exists(query)) return 'component';
  return null;
};

const notFound = (res) => res.status(404).json({ message: 'not found' }).end();

export const listAll = async (req, res) => {
  const tenant = req.headers.tenant;
  const wanted = req.query.type as string | undefined;
  try {
    const [scripts, components] = await Promise.all([
      wanted === 'component' ? [] : Script.find({ tenant }).select('-compiledContent -content').lean().exec(),
      wanted === 'script' ? [] : Component.find({ tenant }).select('-compiledContent -content').lean().exec(),
    ]);
    res.json([
      ...scripts.map(s => ({ ...s, type: 'script' })),
      ...components.map(c => ({ ...c, type: 'component' })),
    ]).end();
  } catch {
    res.status(400).json({ message: 'failed to list' }).end();
  }
};

export const createOne = (req, res) => {
  const type = inferType(req.body);
  return (type === 'component' ? createComponent : createScript)(req, typed(res, type));
};

export const getOne = async (req, res) => {
  const type = await typeOfId(req.params.scriptId, req.headers.tenant);
  if (!type) return notFound(res);
  req.params.componentId = req.params.scriptId;
  return (type === 'component' ? getSingleComponent : getSingleScript)(req, typed(res, type));
};

export const updateOne = async (req, res) => {
  const type = await typeOfId(req.params.scriptId, req.headers.tenant);
  if (!type) return notFound(res);
  req.params.componentId = req.params.scriptId;
  return (type === 'component' ? updateComponent : updateScript)(req, typed(res, type));
};

export const removeOne = async (req, res) => {
  const type = await typeOfId(req.params.scriptId, req.headers.tenant);
  if (!type) return notFound(res);
  req.params.componentId = req.params.scriptId;
  return (type === 'component' ? removeComponent : removeScript)(req, typed(res, type));
};

/**
 * Accepts `{ items: [...] }` (type inferred per item) and, for convenience, `{ scripts }` / `{ components }`.
 * Scripts are upserted first so components pushed in the same batch can import them.
 */
export const bulkUpsert = async (req, res) => {
  const { items = [], scripts = [], components = [] } = req.body || {};
  if (![items, scripts, components].every(Array.isArray)) {
    return res.status(400).json({ message: 'items array is required' }).end();
  }
  const all = [
    ...items,
    ...scripts.map(s => ({ ...s, type: 'script' })),
    ...components.map(c => ({ ...c, type: 'component' })),
  ];
  if (!all.length) return res.status(400).json({ message: 'items array is required' }).end();

  const tenant = req.headers.tenant;
  try {
    const scriptItems = all.filter(i => inferType(i) === 'script');
    const componentItems = all.filter(i => inferType(i) === 'component');
    const scriptResults = scriptItems.length ? await upsertScriptsBulk(tenant, scriptItems) : null;
    const componentResults = componentItems.length ? await upsertComponentsBulk(tenant, req.headers.tenanthost, componentItems) : null;

    const results = [
      ...(scriptResults?.results || []).map(r => ({ ...r, type: 'script' })),
      ...(componentResults?.results || []).map(r => ({ ...r, type: 'component' })),
    ];
    const succeeded = results.filter(r => r.success).length;
    res.json({ total: results.length, succeeded, failed: results.length - succeeded, results }).end();
  } catch (err: any) {
    logger.error('failed to bulk upsert', err?.message);
    res.status(500).json({ message: 'failed to bulk create/update' }).end();
  }
};
