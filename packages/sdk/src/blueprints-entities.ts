import { QelosSDKOptions, RequestExtra } from './types';
import BaseSDK from './base-sdk';
import type { ICommonQueryFilters } from '@qelos/global-types';

export interface IBaseBlueprintEntity {
  identifier: string;
  user?: string;
  workspace?: string;
  tenant?: string;
  created: Date;
  updated: Date;
  metadata: any;
}

// Blueprint entity responses default to the flat shape. Pass $flat: false (or 0)
// to opt back into the wrapped shape; this also keeps SDK behavior consistent
// against older servers that defaulted to wrapped.
function withFlatDefault<Q extends Record<string, any> | undefined>(query?: Q): Record<string, any> {
  if (query && '$flat' in query) {
    return query as Record<string, any>;
  }
  return { ...(query || {}), $flat: true };
}

export type BlueprintEntityFilters = Record<string, any>;

export class QlBlueprintEntitiesQuery<T = any> {
  #filters: BlueprintEntityFilters = {};
  #options: Record<string, any> = {};

  constructor(private entities: QlBlueprintEntities<T>) {}

  where(filters: BlueprintEntityFilters): this {
    Object.assign(this.#filters, filters);
    return this;
  }

  limit(value: number): this {
    this.#options.$limit = value;
    return this;
  }

  skip(value: number): this {
    this.#options.$skip = value;
    return this;
  }

  sort(value: string): this {
    this.#options.$sort = value;
    return this;
  }

  select(fields: string | string[]): this {
    this.#options.$select = Array.isArray(fields) ? fields.join(',') : fields;
    return this;
  }

  toQuery(): ICommonQueryFilters & BlueprintEntityFilters {
    return { ...this.#filters, ...this.#options };
  }

  find(extra?: RequestExtra): Promise<(IBaseBlueprintEntity & T)[]> {
    return this.entities.getList(this.toQuery(), extra);
  }

  findOne(extra?: RequestExtra): Promise<(IBaseBlueprintEntity & T) | undefined> {
    return this.entities
      .getList({ ...this.toQuery(), $limit: 1 }, extra)
      .then((results) => results?.[0]);
  }

  count(extra?: RequestExtra): Promise<number> {
    return this.entities.count(this.toQuery(), extra);
  }
}

export default class QlBlueprintEntities<T = any> extends BaseSDK {
  private relativePath = '/api/blueprints';

  constructor(private options: QelosSDKOptions, private blueprintKey: string) {
    super(options)
  }

  getEntity(identifier: string, extra?: RequestExtra) {
    return this.callJsonApi<IBaseBlueprintEntity & T>(`${this.relativePath}/${this.blueprintKey}/entities/${identifier}${this.getQueryParams(withFlatDefault(extra?.query))}`, extra)
  }

  getList(query?: ICommonQueryFilters & Record<string, any>, extra?: RequestExtra) {
    return this.callJsonApi<(IBaseBlueprintEntity & T)[]>(`${this.relativePath}/${this.blueprintKey}/entities${this.getQueryParams(withFlatDefault(query))}`, extra);
  }

  remove(identifier: string, extra?: RequestExtra): Promise<any> {
    return this.callApi(`${this.relativePath}/${this.blueprintKey}/entities/${identifier}${this.getQueryParams(withFlatDefault(extra?.query))}`, { method: 'delete' });
  }

  update(identifier: string, changes: Partial<T & IBaseBlueprintEntity>, extra?: RequestExtra): Promise<IBaseBlueprintEntity & T> {
    return this.callJsonApi<IBaseBlueprintEntity & T>(
      `${this.relativePath}/${this.blueprintKey}/entities/${identifier}${this.getQueryParams(withFlatDefault(extra?.query))}`,
      {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changes),
        ...(extra || {}),
      }
    )
  }

  create(entity: T & IBaseBlueprintEntity, extra?: RequestExtra): Promise<IBaseBlueprintEntity & T> {
    return this.callJsonApi<IBaseBlueprintEntity & T>(`${this.relativePath}/${this.blueprintKey}/entities${this.getQueryParams(withFlatDefault(extra?.query))}`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entity),
      ...(extra || {}),
    })
  }

  query(): QlBlueprintEntitiesQuery<T> {
    return new QlBlueprintEntitiesQuery<T>(this);
  }

  where(filters: BlueprintEntityFilters): QlBlueprintEntitiesQuery<T> {
    return this.query().where(filters);
  }

  limit(value: number): QlBlueprintEntitiesQuery<T> {
    return this.query().limit(value);
  }

  skip(value: number): QlBlueprintEntitiesQuery<T> {
    return this.query().skip(value);
  }

  sort(value: string): QlBlueprintEntitiesQuery<T> {
    return this.query().sort(value);
  }

  select(fields: string | string[]): QlBlueprintEntitiesQuery<T> {
    return this.query().select(fields);
  }

  find(extra?: RequestExtra): Promise<(IBaseBlueprintEntity & T)[]> {
    return this.getList(undefined, extra);
  }

  findOne(identifier: string, extra?: RequestExtra): Promise<IBaseBlueprintEntity & T> {
    return this.getEntity(identifier, extra);
  }

  count(query?: BlueprintEntityFilters, extra?: RequestExtra): Promise<number> {
    return this
      .callJsonApi<{ count: number }>(`${this.relativePath}/${this.blueprintKey}/charts/count${this.getQueryParams(query)}`, extra)
      .then((res) => res?.count ?? 0);
  }

  updateOne(identifier: string, changes: Partial<T & IBaseBlueprintEntity>, extra?: RequestExtra): Promise<IBaseBlueprintEntity & T> {
    return this.update(identifier, changes, extra);
  }

  deleteOne(identifier: string, extra?: RequestExtra): Promise<any> {
    return this.remove(identifier, extra);
  }
}
