import { QelosSDKOptions, RequestExtra } from './types';
import BaseSDK from './base-sdk';
import type { ICommonQueryFilters } from '@qelos/global-types';

export default class QlBlueprintEntities<T = any> extends BaseSDK {
  private relativePath = '/api/blueprints';

  constructor(private options: QelosSDKOptions, private blueprintKey: string) {
    super(options)
  }

  getEntity(identifier: string, extra?: RequestExtra) {
    return this.callJsonApi<T>(`${this.relativePath}/${this.blueprintKey}/entities/${identifier}${this.getQueryParams(extra?.query)}`, extra)
  }

  getList(query?: ICommonQueryFilters & Record<string, any>, extra?: RequestExtra) {
    return this.callJsonApi<T[]>(`${this.relativePath}/${this.blueprintKey}/entities${this.getQueryParams(query)}`, extra);
  }

  remove(identifier: string, extra?: RequestExtra): Promise<any> {
    return this.callApi(`${this.relativePath}/${this.blueprintKey}/entities/${identifier}${this.getQueryParams(extra?.query)}`, { method: 'delete' });
  }

  update(identifier: string, changes: Partial<T>, extra?: RequestExtra): Promise<T> {
    return this.callJsonApi<T>(
      `${this.relativePath}/${this.blueprintKey}/entities/${identifier}${this.getQueryParams(extra?.query)}`,
      {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changes),
        ...(extra || {}),
      }
    )
  }

  create(entity: T, extra?: Partial<RequestInit>): Promise<T> {
    return this.callJsonApi<T>(`${this.relativePath}/${this.blueprintKey}/entities${this.getQueryParams()}`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entity),
      ...(extra || {}),
    })
  }
}
