import { QelosSDKOptions } from './types';
import BaseSDK from './base-sdk';

export default class QlBlueprintEntities<T = any> extends BaseSDK {
  private relativePath = '/api/blueprints';

  constructor(private options: QelosSDKOptions, private blueprintKey: string) {
    super(options)
  }

  getEntity(identifier: string) {
    return this.callJsonApi<T>(`${this.relativePath}/${this.blueprintKey}/${identifier}${this.getQueryParams()}`)
  }

  getList(query?: Record<string, any>) {
    return this.callJsonApi<T[]>(`${this.relativePath}/${this.blueprintKey}${this.getQueryParams(query)}`);
  }

  remove(identifier: string): Promise<any> {
    return this.callApi(`${this.relativePath}/${this.blueprintKey}/${identifier}${this.getQueryParams()}`, { method: 'delete' });
  }

  update(identifier: string, changes: Partial<T>): Promise<T> {
    return this.callJsonApi<T>(
      `${this.relativePath}/${this.blueprintKey}/${identifier}${this.getQueryParams()}`,
      {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changes)
      }
    )
  }

  create(entity: T): Promise<T> {
    return this.callJsonApi<T>(`${this.relativePath}/${this.blueprintKey}${this.getQueryParams()}`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(entity)
    })
  }
}
