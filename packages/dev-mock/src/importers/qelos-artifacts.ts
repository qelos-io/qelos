import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

/**
 * Importer for folders produced by the Qelos CLI (`qelos pull` and `qelos dump`).
 * The on-disk layout is documented in the package README ("Importing Qelos CLI artifacts").
 */

type AnyDoc = { _id: string; [key: string]: any };

export interface ArtifactCollection {
  findOne(filter: (item: AnyDoc) => boolean): AnyDoc | undefined;
  insert(doc: AnyDoc): AnyDoc;
  replace(id: string, doc: AnyDoc): AnyDoc | undefined;
}

/** The minimal slice of `MockState` the importer needs. */
export interface ArtifactState {
  collection(name: any): ArtifactCollection;
  entities: {
    list(blueprint: string): AnyDoc[];
    insert(blueprint: string, doc: Record<string, any>): AnyDoc;
    replace(blueprint: string, id: string, doc: Record<string, any>): AnyDoc | undefined;
  };
}

export interface ImportOptions {
  /** what to do when a document already exists (matched by `_id`/identifier). default 'replace' */
  onConflict?: 'replace' | 'skip';
  /** receives warnings (unknown blueprints, unparsable files, ...). default: silent */
  warn?: (message: string) => void;
  /** receives debug lines (ignored files, ...). default: silent */
  debug?: (message: string) => void;
}

export type ArtifactKind = 'pull' | 'dump' | 'mixed' | 'empty';

export interface ImportCounts {
  created: number;
  replaced: number;
  skipped: number;
}

export interface ImportReport {
  kind: ArtifactKind;
  /** per collection name (entities are reported as `entities:<blueprint>`) */
  counts: Record<string, ImportCounts>;
  warnings: string[];
}

/** Fields that may carry credentials; never copied into mock state. */
const SECRET_USER_FIELDS = ['password', 'salt', 'token', 'tokens', 'refreshToken', 'resetToken', 'resetPasswordToken'];
const HELPER_DIRS = ['prompts', 'html', 'micro-frontends'];
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

interface Ctx {
  root: string;
  state: ArtifactState;
  replace: boolean;
  report: ImportReport;
  warn: (m: string) => void;
  debug: (m: string) => void;
  consumed: Set<string>;
  pull: boolean;
  dump: boolean;
}

const isDir = (p: string) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};
const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const detId = (seed: string) => createHash('sha1').update(seed).digest('hex').slice(0, 24);
const rel = (ctx: Ctx, p: string) => relative(ctx.root, p).replace(/\\/g, '/') || '.';
const inside = (root: string, p: string) => {
  const r = relative(root, p);
  return !!r && !r.startsWith('..') && !isAbsolute(r);
};

function listFiles(dir: string, suffix: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(suffix) && !isDir(join(dir, f)))
      .sort();
  } catch {
    return [];
  }
}

function readJson(ctx: Ctx, file: string): any {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    // never echo file content: it may hold secrets
    ctx.warn(`could not parse ${rel(ctx, file)}, skipped`);
    return undefined;
  }
}

function readText(ctx: Ctx, file: string): string | undefined {
  if (!inside(ctx.root, file) || !existsSync(file)) {
    ctx.warn(`referenced file ${rel(ctx, file)} not found (or outside the artifacts folder), skipped`);
    return undefined;
  }
  return readFileSync(file, 'utf8');
}

/** Replace `{ $ref: './file' }` objects with the referenced file's text (local files only). */
function resolveRefs(ctx: Ctx, value: any, baseDir: string): any {
  if (Array.isArray(value)) return value.map((v) => resolveRefs(ctx, v, baseDir));
  if (!isObject(value)) return value;
  if (typeof value.$ref === 'string') {
    if (/^https?:\/\//i.test(value.$ref)) {
      ctx.debug(`remote $ref not fetched: ${value.$ref.split('?')[0]}`);
      return value;
    }
    return readText(ctx, resolve(baseDir, value.$ref)) ?? value;
  }
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRefs(ctx, v, baseDir)]));
}

function count(ctx: Ctx, name: string, kind: keyof ImportCounts) {
  (ctx.report.counts[name] ??= { created: 0, replaced: 0, skipped: 0 })[kind]++;
}

/** Insert or (depending on `onConflict`) replace by `_id` or one of the identifying `keys`. Returns the final `_id`. */
function upsert(ctx: Ctx, name: string, input: Record<string, any>, keys: string[], idSeed: string): string {
  const doc = { ...input } as AnyDoc;
  if (typeof doc._id !== 'string' || !doc._id) delete (doc as any)._id;
  const col = ctx.state.collection(name);
  const existing = col.findOne(
    (d) =>
      (doc._id !== undefined && d._id === doc._id) ||
      keys.some((k) => doc[k] !== undefined && doc[k] !== null && d[k] === doc[k]),
  );
  if (existing) {
    if (!ctx.replace) {
      count(ctx, name, 'skipped');
      return existing._id;
    }
    count(ctx, name, 'replaced');
    return col.replace(existing._id, { ...doc, _id: doc._id ?? existing._id })!._id;
  }
  count(ctx, name, 'created');
  return col.insert({ ...doc, _id: doc._id ?? detId(`${name}:${idSeed}`) })._id;
}

/** Directories that may hold a resource type: `<root>/<name>` and/or the root itself (single-type pulls). */
function locate(ctx: Ctx, names: string[], flat: (dir: string) => boolean): string[] {
  const dirs: string[] = [];
  for (const n of names) {
    const d = join(ctx.root, n);
    if (isDir(d)) {
      dirs.push(d);
      ctx.consumed.add(n);
    }
  }
  if (flat(ctx.root)) dirs.push(ctx.root);
  if (dirs.length) ctx.pull = true;
  return dirs;
}
const hasSuffix = (suffix: string) => (dir: string) => listFiles(dir, suffix).length > 0;

function eachJsonFile(ctx: Ctx, dirs: string[], suffix: string, fn: (data: any, file: string, dir: string) => void) {
  for (const dir of dirs) {
    for (const f of listFiles(dir, suffix)) {
      if (dir === ctx.root) ctx.consumed.add(f);
      const data = readJson(ctx, join(dir, f));
      if (!isObject(data)) {
        if (data !== undefined) ctx.warn(`${rel(ctx, join(dir, f))} is not a JSON object, skipped`);
        continue;
      }
      fn(data, f, dir);
    }
  }
}

// ---------------------------------------------------------------- pull types

function importBlueprints(ctx: Ctx) {
  const dirs = locate(ctx, ['blueprints'], hasSuffix('.blueprint.json'));
  eachJsonFile(ctx, dirs, '.blueprint.json', (bp, file) => {
    if (typeof bp.identifier !== 'string' || !bp.identifier) return ctx.warn(`${file}: missing "identifier", skipped`);
    upsert(ctx, 'blueprints', bp, ['identifier'], bp.identifier);
  });
}

function importConfigs(ctx: Ctx) {
  const dirs = locate(ctx, ['configs', 'config', 'configurations'], hasSuffix('.config.json'));
  eachJsonFile(ctx, dirs, '.config.json', (cfg, file, dir) => {
    if (typeof cfg.key !== 'string' || !cfg.key) return ctx.warn(`${file}: missing "key", skipped`);
    upsert(ctx, 'configurations', resolveRefs(ctx, cfg, dir), ['key'], cfg.key);
  });
}

function importComponents(ctx: Ctx) {
  const dirs = locate(ctx, ['components'], (d) => existsSync(join(d, 'components.json')));
  for (const dir of dirs) {
    const file = join(dir, 'components.json');
    if (!existsSync(file)) continue;
    if (dir === ctx.root) ctx.consumed.add('components.json');
    const meta = readJson(ctx, file);
    if (!isObject(meta)) continue;
    for (const entry of Object.values<any>(meta)) {
      if (!isObject(entry) || typeof entry.identifier !== 'string') continue;
      const base = resolve(dir, entry.identifier);
      let found: { path: string; ext: string } | undefined;
      for (const ext of ['.vue', '.ts', '.js']) {
        if (inside(dir, base + ext) && existsSync(base + ext)) {
          found = { path: base + ext, ext };
          break;
        }
      }
      if (!found) {
        ctx.warn(`component "${entry.identifier}": source file not found, skipped`);
        continue;
      }
      if (dir === ctx.root) ctx.consumed.add(entry.identifier.split('/')[0] + (entry.identifier.includes('/') ? '' : found.ext));
      upsert(
        ctx,
        'components',
        { ...entry, type: found.ext === '.vue' ? 'component' : 'script', content: readFileSync(found.path, 'utf8') },
        ['identifier'],
        entry.identifier,
      );
    }
  }
}

function importBlocks(ctx: Ctx) {
  const dirs = locate(ctx, ['blocks'], (d) => existsSync(join(d, 'blocks.json')));
  for (const dir of dirs) {
    const file = join(dir, 'blocks.json');
    if (!existsSync(file)) continue;
    if (dir === ctx.root) ctx.consumed.add('blocks.json');
    const meta = readJson(ctx, file);
    if (!isObject(meta)) continue;
    for (const [key, entry] of Object.entries<any>(meta)) {
      if (!isObject(entry)) continue;
      const html = join(dir, `${key}.html`);
      if (!inside(dir, html) || !existsSync(html)) {
        ctx.warn(`block "${key}": ${key}.html not found, skipped`);
        continue;
      }
      if (dir === ctx.root) ctx.consumed.add(`${key}.html`);
      upsert(ctx, 'blocks', { ...entry, content: readFileSync(html, 'utf8') }, ['name'], key);
    }
  }
}

function importPlugins(ctx: Ctx) {
  const dirs = locate(ctx, ['plugins'], hasSuffix('.plugin.json'));
  eachJsonFile(ctx, dirs, '.plugin.json', (plugin, file, dir) => {
    if (typeof plugin.apiPath !== 'string' || !plugin.apiPath) return ctx.warn(`${file}: missing "apiPath", skipped`);
    upsert(ctx, 'plugins', resolveRefs(ctx, plugin, dir), ['apiPath'], plugin.apiPath);
  });
}

/** connection file (absolute path) -> `_id` in state */
function importConnections(ctx: Ctx, ids: Map<string, string>) {
  const dirs = locate(ctx, ['connections'], hasSuffix('.connection.json'));
  eachJsonFile(ctx, dirs, '.connection.json', (conn, file, dir) => {
    // `authentication` only holds `{ $var: 'ENV_NAME' }` placeholders in pull output; kept as-is
    const id = upsert(ctx, 'connections', conn, ['name'], conn.name ?? file);
    ids.set(join(dir, file), id);
  });
}

function importIntegrations(ctx: Ctx, connectionIds: Map<string, string>) {
  const dirs = locate(ctx, ['integrations'], hasSuffix('.integration.json'));
  const resolveSource = (integ: any, side: 'trigger' | 'target', dir: string) => {
    const src = integ[side]?.source;
    if (!isObject(src) || typeof src.$refId !== 'string') return;
    const file = resolve(dir, src.$refId);
    let id = connectionIds.get(file);
    if (!id && file.endsWith('.connection.json') && existsSync(file)) {
      const c = readJson(ctx, file);
      if (isObject(c) && typeof c._id === 'string') id = c._id;
    }
    if (id) integ[side].source = id;
    else ctx.warn(`integration ${side}.source reference ${basename(file)} could not be resolved`);
  };
  eachJsonFile(ctx, dirs, '.integration.json', (integ, file, dir) => {
    const doc = resolveRefs(ctx, integ, dir);
    resolveSource(doc, 'trigger', dir);
    resolveSource(doc, 'target', dir);
    upsert(ctx, 'integrations', doc, [], file);
  });
}

function importPricingPlans(ctx: Ctx) {
  const dirs = locate(ctx, ['pricing-plans'], hasSuffix('.pricing-plan.json'));
  eachJsonFile(ctx, dirs, '.pricing-plan.json', (plan, file) => {
    upsert(ctx, 'pricingPlans', plan, ['name'], plan.name ?? file);
  });
}

// ---------------------------------------------------------------- dump types

function importList(ctx: Ctx, file: string, collection: string, keys: string[], clean?: (d: any) => any) {
  const path = join(ctx.root, file);
  if (!existsSync(path)) return;
  ctx.consumed.add(file);
  ctx.dump = true;
  const list = readJson(ctx, path);
  if (list === undefined) return;
  if (!Array.isArray(list)) return ctx.warn(`${file} is not an array, skipped`);
  list.forEach((item, i) => {
    if (!isObject(item)) return;
    const doc = clean ? clean(item) : item;
    upsert(ctx, collection, doc, keys, `${file}:${i}:${item.email ?? item.name ?? ''}`);
  });
}

function importEntities(ctx: Ctx) {
  const base = join(ctx.root, 'entities');
  if (!isDir(base)) return;
  ctx.consumed.add('entities');
  ctx.dump = true;

  // dumps made while users.json/workspaces.json existed replace ids with usernames / workspace names
  const lookup = (collection: string, field: string) => {
    const cache = new Map<string, string | undefined>();
    return (value: any) => {
      if (typeof value !== 'string' || !value || OBJECT_ID_RE.test(value)) return value;
      if (!cache.has(value)) cache.set(value, ctx.state.collection(collection).findOne((d) => d[field] === value)?._id);
      return cache.get(value) ?? value;
    };
  };
  const userId = lookup('users', 'username');
  const workspaceId = lookup('workspaces', 'name');

  for (const bp of readdirSync(base).sort()) {
    const bpDir = join(base, bp);
    if (!isDir(bpDir)) {
      ctx.debug(`ignored entities/${bp}`);
      continue;
    }
    if (!ctx.state.collection('blueprints').findOne((b) => b.identifier === bp)) {
      ctx.warn(`entities for unknown blueprint "${bp}" skipped (import its ${bp}.blueprint.json first)`);
      continue;
    }
    const existing = new Map<string, AnyDoc>();
    for (const e of ctx.state.entities.list(bp)) {
      existing.set(`_id:${e._id}`, e);
      if (e.identifier) existing.set(`identifier:${e.identifier}`, e);
    }
    const name = `entities:${bp}`;
    for (const f of listFiles(bpDir, '.json')) {
      const items = readJson(ctx, join(bpDir, f));
      if (items === undefined) continue;
      if (!Array.isArray(items)) {
        ctx.warn(`entities/${bp}/${f} is not an array, skipped`);
        continue;
      }
      items.forEach((item, i) => {
        if (!isObject(item)) return;
        const doc: Record<string, any> = { ...item };
        if (doc.user !== undefined) doc.user = userId(doc.user);
        if (doc.workspace !== undefined) doc.workspace = workspaceId(doc.workspace);
        if (typeof doc._id !== 'string' || !doc._id) doc._id = detId(`entity:${bp}:${f}:${i}`);
        const found = existing.get(`_id:${doc._id}`) ?? (doc.identifier ? existing.get(`identifier:${doc.identifier}`) : undefined);
        if (found) {
          if (!ctx.replace) return count(ctx, name, 'skipped');
          count(ctx, name, 'replaced');
          const saved = ctx.state.entities.replace(bp, found._id, doc)!;
          existing.set(`_id:${saved._id}`, saved);
          if (saved.identifier) existing.set(`identifier:${saved.identifier}`, saved);
          return;
        }
        count(ctx, name, 'created');
        const saved = ctx.state.entities.insert(bp, doc);
        existing.set(`_id:${saved._id}`, saved);
        if (saved.identifier) existing.set(`identifier:${saved.identifier}`, saved);
      });
    }
  }
}

const stripSecrets = (user: Record<string, any>) => {
  const copy = { ...user };
  for (const k of SECRET_USER_FIELDS) delete copy[k];
  return copy;
};

// ---------------------------------------------------------------- entry point

/**
 * Import a folder produced by `qelos pull` and/or `qelos dump` into the mock state.
 * Auto-detects the layout, is idempotent (matches by `_id`/identifier) and never logs file contents.
 */
export function importQelosArtifacts(dir: string, state: ArtifactState, opts: ImportOptions = {}): ImportReport {
  const root = resolve(dir);
  const report: ImportReport = { kind: 'empty', counts: {}, warnings: [] };
  if (!isDir(root)) {
    report.warnings.push(`artifacts folder not found: ${dir}`);
    opts.warn?.(report.warnings[0]);
    return report;
  }
  const ctx: Ctx = {
    root,
    state,
    replace: (opts.onConflict ?? 'replace') === 'replace',
    report,
    warn: (m) => {
      report.warnings.push(m);
      opts.warn?.(m);
    },
    debug: (m) => opts.debug?.(m),
    consumed: new Set(['state', ...HELPER_DIRS]),
    pull: false,
    dump: false,
  };

  // order matters: blueprints before entities, users/workspaces before entities, connections before integrations
  const connectionIds = new Map<string, string>();
  importBlueprints(ctx);
  importConfigs(ctx);
  importComponents(ctx);
  importBlocks(ctx);
  importPlugins(ctx);
  importConnections(ctx, connectionIds);
  importIntegrations(ctx, connectionIds);
  importPricingPlans(ctx);
  importList(ctx, 'users.json', 'users', ['email', 'username'], stripSecrets);
  importList(ctx, 'workspaces.json', 'workspaces', ['name'], (w) => ({ labels: [], members: [], invites: [], ...w }));
  importEntities(ctx);

  for (const entry of readdirSync(root).sort()) {
    if (!ctx.consumed.has(entry)) ctx.debug(`ignored ${entry}`);
  }
  report.kind = ctx.pull && ctx.dump ? 'mixed' : ctx.pull ? 'pull' : ctx.dump ? 'dump' : 'empty';
  return report;
}
