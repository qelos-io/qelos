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
}
