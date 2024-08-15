import { QelosSDKOptions } from './types';
import BaseSDK from './base-sdk';
import { ICommonQueryFilters } from '@qelos/global-types';

export default class QlBlueprintEntities<T = any> extends BaseSDK {
  private relativePath = '/api/blueprints';

  constructor(private options: QelosSDKOptions, private blueprintKey: string) {
    super(options)
  }

  getEntity(identifier: string) {
    return this.callJsonApi<T>(`${this.relativePath}/${this.blueprintKey}/entities/${identifier}${this.getQueryParams()}`)
  }

  getList(query?: ICommonQueryFilters & Record<string, any>) {
    return this.callJsonApi<T[]>(`${this.relativePath}/${this.blueprintKey}/entities${this.getQueryParams(query)}`);
  }

  remove(identifier: string): Promise<any> {
    return this.callApi(`${this.relativePath}/${this.blueprintKey}/entities/${identifier}${this.getQueryParams()}`, { method: 'delete' });
  }

  update(identifier: string, changes: Partial<T>): Promise<T> {
    return this.callJsonApi<T>(
      `${this.relativePath}/${this.blueprintKey}/entities/${identifier}${this.getQueryParams()}`,
      {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changes)
      }
    )
  }

  create(entity: T): Promise<T> {
    return this.callJsonApi<T>(`${this.relativePath}/${this.blueprintKey}/entities${this.getQueryParams()}`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entity)
    })
  }
}
