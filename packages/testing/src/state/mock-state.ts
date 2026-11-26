import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { writeFile, rename, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { MockAuthOptions, MockPersonaSeed, MockSeed } from '../config/types.js';
import { sha256 } from '../auth/tokens.js';
import { generateId } from './ids.js';

export type Doc = { _id: string; [key: string]: any };

export const COLLECTION_NAMES = [
  'users',
  'workspaces',
  'memberships',
  'sessions',
  'personas',
  'blueprints',
  'configurations',
  'blocks',
  'apiTokens',
  'components',
  'plugins',
  'integrations',
  'connections',
  'pricingPlans',
  'coupons',
  'subscriptions',
  'invoices',

  'events',
  'agents',
  'aiResponses',
  'lambdas',
  'threads',
  'encryptedData',
  'vectorStores',
  'functions',
  'scripts',
  'drafts',
] as const;
export type CollectionName = (typeof COLLECTION_NAMES)[number];
const ENTITIES_FILE = 'entities';

/** Typed accessor over one collection (array of documents with `_id`). */
export class Collection<T extends Doc = Doc> {
  constructor(
    private items: T[],
    private touch: () => void,
  ) {}

  /** @internal swap content in place, keeping the accessor valid */
  _replace(items: T[]) {
    this.items.splice(0, this.items.length, ...items);
  }

  list(filter?: (item: T) => boolean): T[] {
    return filter ? this.items.filter(filter) : [...this.items];
  }
  get(id: string): T | undefined {
    return this.items.find((i) => i._id === id);
  }
  findOne(filter: (item: T) => boolean): T | undefined {
    return this.items.find(filter);
  }
  insert(doc: Omit<T, '_id'> & { _id?: string }): T {
    const item = { ...doc, _id: doc._id || generateId() } as T;
    this.items.push(item);
    this.touch();
    return item;
  }
  /** Replace a document wholesale (the new doc may carry a different `_id`). */
  replace(id: string, doc: Omit<T, '_id'> & { _id?: string }): T | undefined {
    const idx = this.items.findIndex((i) => i._id === id);
    if (idx < 0) return undefined;
    const item = { ...doc, _id: doc._id || id } as T;
    this.items[idx] = item;
    this.touch();
    return item;
  }
  update(id: string, patch: Partial<T>): T | undefined {
    const item = this.get(id);
    if (!item) return undefined;
    Object.assign(item, patch, { _id: id });
    this.touch();
    return item;
  }
  remove(id: string): boolean {
    const idx = this.items.findIndex((i) => i._id === id);
    if (idx < 0) return false;
    this.items.splice(idx, 1);
    this.touch();
    return true;
  }
  get size() {
    return this.items.length;
  }
}

/** Entities grouped by blueprint identifier. */
export class EntityStore {
  constructor(
    private data: Record<string, Doc[]>,
    private touch: () => void,
  ) {}

  /** @internal */
  _replace(data: Record<string, Doc[]>) {
    for (const k of Object.keys(this.data)) delete this.data[k];
    Object.assign(this.data, data);
  }

  /** replace all entities of one blueprint */
  replaceBlueprint(blueprint: string, items: Doc[]) {
    this.data[blueprint] = items;
    this.touch();
  }

  blueprints(): string[] {
    return Object.keys(this.data);
  }
  list(blueprint: string): Doc[] {
    return [...(this.data[blueprint] || [])];
  }
  get(blueprint: string, id: string): Doc | undefined {
    return this.data[blueprint]?.find((e) => e._id === id);
  }
  insert(blueprint: string, doc: Record<string, any>): Doc {
    const item = { ...doc, _id: doc._id || generateId() } as Doc;
    (this.data[blueprint] ??= []).push(item);
    this.touch();
    return item;
  }
  replace(blueprint: string, id: string, doc: Record<string, any>): Doc | undefined {
    const list = this.data[blueprint];
    const idx = list ? list.findIndex((e) => e._id === id) : -1;
    if (idx < 0) return undefined;
    const item = { ...doc, _id: doc._id || id } as Doc;
    list[idx] = item;
    this.touch();
    return item;
  }
  update(blueprint: string, id: string, patch: Record<string, any>): Doc | undefined {
    const item = this.get(blueprint, id);
    if (!item) return undefined;
    Object.assign(item, patch, { _id: id });
    this.touch();
    return item;
  }
  remove(blueprint: string, id: string): boolean {
    const list = this.data[blueprint];
    const idx = list ? list.findIndex((e) => e._id === id) : -1;
    if (idx < 0) return false;
    list.splice(idx, 1);
    this.touch();
    return true;
  }
}

export interface MockStateOptions {
  dataDir?: string;
  persist?: boolean;
  seed?: MockSeed;
  persistDebounceMs?: number;
  defaultPersona?: string;
  tenantId?: string;
  auth?: MockAuthOptions;
}

/** Runtime settings read by route modules (auth, permissions...). */
export interface MockStateSettings {
  defaultPersona?: string;
  tenantId: string;
  /** role -> permissions, seed merged over the defaults */
  roles: Record<string, string[]>;
  /** API tokens declared on personas: token hash -> persona email. Read from the seed on every start, never saved */
  personaTokens: Map<string, string>;
  auth: Required<MockAuthOptions>;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['*'],
  plugin: ['*'],
  user: ['me:*', 'workspaces:*', 'invites:*', 'entities:*'],
  member: ['me:*', 'workspaces:read', 'entities:read'],
};

export type MockSnapshot = Record<CollectionName, Doc[]> & { entities: Record<string, Doc[]> };

const withIds = (list: Array<Record<string, any>> = []): Doc[] =>
  list.map((i) => ({ ...i, _id: i._id || generateId() }));

/** Personas as they are stored: `default` and `apiTokens` configure the mock and are not part of a user. */
const personaDocs = (personas: MockPersonaSeed[] = []): Doc[] =>
  withIds(personas.map(({ default: _default, apiTokens: _apiTokens, ...persona }) => persona));

export class MockState {
  readonly users: Collection;
  readonly workspaces: Collection;
  readonly memberships: Collection;
  readonly sessions: Collection;
  readonly personas: Collection;
  readonly blueprints: Collection;
  readonly configurations: Collection;
  readonly blocks: Collection;
  readonly apiTokens: Collection;
  readonly settings: MockStateSettings;
  /** incremented by every `reset()`, lets derived data (seeded personas) detect a reseed */
  resetCount = 0;
  readonly components: Collection;
  readonly scripts: Collection;
  readonly plugins: Collection;
  readonly integrations: Collection;
  readonly connections: Collection;
  readonly pricingPlans: Collection;

  readonly events: Collection;
  readonly agents: Collection;
  readonly aiResponses: Collection;
  readonly lambdas: Collection;
  readonly entities: EntityStore;
  /** true when state was loaded from previously persisted JSON files (as opposed to seeded) */
  readonly restored: boolean;

  private collections: Record<CollectionName, Collection>;
  private raw: Record<CollectionName, Doc[]>;
  private rawEntities: Record<string, Doc[]> = {};
  private dirty = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private writing: Promise<void> = Promise.resolve();
  private readonly stateDir?: string;
  private readonly debounceMs: number;

  constructor(private options: MockStateOptions = {}) {
    this.debounceMs = options.persistDebounceMs ?? 50;
    this.stateDir = options.persist && options.dataDir ? join(options.dataDir, 'state') : undefined;
    const touch = (name: string) => () => this.markDirty(name);
    this.raw = Object.fromEntries(COLLECTION_NAMES.map((n) => [n, [] as Doc[]])) as Record<CollectionName, Doc[]>;
    this.collections = Object.fromEntries(
      COLLECTION_NAMES.map((n) => [n, new Collection(this.raw[n], touch(n))]),
    ) as Record<CollectionName, Collection>;
    this.users = this.collections.users;
    this.workspaces = this.collections.workspaces;
    this.memberships = this.collections.memberships;
    this.sessions = this.collections.sessions;
    this.personas = this.collections.personas;
    this.blueprints = this.collections.blueprints;
    this.configurations = this.collections.configurations;
    this.blocks = this.collections.blocks;
    this.apiTokens = this.collections.apiTokens;
    const a = options.auth || {};
    this.settings = {
      defaultPersona: options.defaultPersona,
      tenantId: options.tenantId || '0',
      roles: { ...DEFAULT_ROLE_PERMISSIONS, ...(options.seed?.roles || {}) },
      personaTokens: new Map(),
      auth: {
        accessTokenTtlMs: a.accessTokenTtlMs ?? 300 * 60 * 1000,
        refreshTokenTtlMs: a.refreshTokenTtlMs ?? 30 * 24 * 60 * 60 * 1000,
        cookieTokenTtlMs: a.cookieTokenTtlMs ?? 30 * 24 * 60 * 60 * 1000,
        personalWorkspace: a.personalWorkspace ?? false,
        defaultRole: a.defaultRole ?? 'user',
      },
    };
    this.addPersonaTokens(options.seed?.personas);
    this.components = this.collections.components;
    this.scripts = this.collections.scripts;
    this.plugins = this.collections.plugins;
    this.integrations = this.collections.integrations;
    this.connections = this.collections.connections;
    this.pricingPlans = this.collections.pricingPlans;

    this.events = this.collections.events;
    this.agents = this.collections.agents;
    this.aiResponses = this.collections.aiResponses;
    this.lambdas = this.collections.lambdas;
    this.entities = new EntityStore(this.rawEntities, touch(ENTITIES_FILE));

    this.restored = this.loadFromDisk();
    if (!this.restored) {
      this.applySeed();
      // persist the initial seeded state
      if (this.stateDir) this.markAllDirty();
    }
  }

  /** Generic accessor by collection name. */
  collection(name: CollectionName): Collection {
    const c = this.collections[name];
    if (!c) throw new Error(`@qelos/testing: unknown collection "${name}"`);
    return c;
  }

  /** Find a persona (or user) by id or email. */
  resolvePersona(idOrEmail: string): Doc | undefined {
    const match = (d: Doc) => d._id === idOrEmail || d.email === idOrEmail;
    return this.personas.findOne(match) || this.users.findOne(match);
  }

  snapshot(): MockSnapshot {
    return structuredClone({ ...this.raw, entities: this.rawEntities }) as MockSnapshot;
  }

  /** Drop all data and reseed from the configured seed. */
  reset(): void {
    this.resetCount++;
    this.applySeed();
    if (this.stateDir) this.markAllDirty();
  }

  /**
   * Merge a seed into the current state without dropping existing data:
   * documents are upserted by `_id` (new documents get generated ids).
   */
  seed(seed: MockSeed): void {
    const upsert = (list: Doc[], doc: Doc) => {
      const idx = list.findIndex((d) => d._id === doc._id);
      if (idx >= 0) list[idx] = doc;
      else list.push(doc);
    };
    this.addPersonaTokens(seed.personas);
    const personas = personaDocs(seed.personas);
    for (const name of COLLECTION_NAMES) {
      let items: Doc[] = [];
      if (name === 'personas') items = personas;
      else if (name === 'users') items = [...withIds(seed.users), ...personas.map((p) => ({ ...p }))];
      else if (name in seed) items = withIds((seed as any)[name]);
      if (!items.length) continue;
      const merged = this.collections[name].list();
      for (const item of items) upsert(merged, item);
      this.collections[name]._replace(merged);
      this.markDirty(name);
    }
    for (const [bp, list] of Object.entries(seed.entities || {})) {
      const merged = this.entities.list(bp);
      for (const item of withIds(list)) upsert(merged, item);
      this.entities.replaceBlueprint(bp, merged);
    }
  }

  /** Write all pending changes now. */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.writing = this.writing.then(() => this.writeDirty());
    return this.writing;
  }

  /** Flush pending writes. */
  async close(): Promise<void> {
    await this.flush();
  }

  private addPersonaTokens(personas: MockPersonaSeed[] = []) {
    for (const { email, apiTokens } of personas) {
      for (const token of apiTokens ?? []) this.settings.personaTokens.set(sha256(token), email);
    }
  }

  private applySeed() {
    const seed = this.options.seed || {};
    const personas = personaDocs(seed.personas);
    for (const name of COLLECTION_NAMES) {
      let items: Doc[] = [];
      if (name === 'personas') items = personas;
      else if (name === 'users') items = [...withIds(seed.users), ...personas.map((p) => ({ ...p }))];
      else if (name in seed) items = withIds((seed as any)[name]);
      this.collections[name]._replace(items);
    }
    this.entities._replace(
      Object.fromEntries(Object.entries(seed.entities || {}).map(([bp, list]) => [bp, withIds(list)])),
    );
  }

  /** @returns true if a persisted state existed and was loaded */
  private loadFromDisk(): boolean {
    if (!this.stateDir || !existsSync(this.stateDir)) return false;
    const files = new Set(readdirSync(this.stateDir));
    if (![...COLLECTION_NAMES, ENTITIES_FILE].some((n) => files.has(`${n}.json`))) return false;
    const read = (name: string) => {
      const file = join(this.stateDir!, `${name}.json`);
      if (!existsSync(file)) return undefined;
      try {
        return JSON.parse(readFileSync(file, 'utf8'));
      } catch (e: any) {
        throw new Error(`@qelos/testing: failed to read state file ${file}: ${e.message}`);
      }
    };
    for (const name of COLLECTION_NAMES) {
      const data = read(name);
      this.collections[name]._replace(Array.isArray(data) ? data : []);
    }
    const entities = read(ENTITIES_FILE);
    this.entities._replace(entities && typeof entities === 'object' && !Array.isArray(entities) ? entities : {});
    return true;
  }

  private markAllDirty() {
    for (const n of COLLECTION_NAMES) this.dirty.add(n);
    this.dirty.add(ENTITIES_FILE);
    this.schedule();
  }

  private markDirty(name: string) {
    if (!this.stateDir) return;
    this.dirty.add(name);
    this.schedule();
  }

  private schedule() {
    if (!this.stateDir || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush().catch((e) => console.error('[qelos-testing] failed to persist state:', e));
    }, this.debounceMs);
    this.timer.unref?.();
  }

  private async writeDirty() {
    if (!this.stateDir || !this.dirty.size) return;
    const names = [...this.dirty];
    this.dirty.clear();
    await mkdir(this.stateDir, { recursive: true });
    await Promise.all(
      names.map(async (name) => {
        const data = name === ENTITIES_FILE ? this.rawEntities : this.raw[name as CollectionName];
        const file = join(this.stateDir!, `${name}.json`);
        const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
        try {
          await writeFile(tmp, JSON.stringify(data, null, 2));
          await rename(tmp, file);
        } catch (e) {
          this.dirty.add(name);
          await rm(tmp, { force: true }).catch(() => {});
          throw e;
        }
      }),
    );
  }
}
