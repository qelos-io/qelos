import BaseSDK from '../base-sdk';
import { QelosSDKOptions } from '../types';
import { IBlueprint } from '@qelos/global-types';

type IBlueprintUpdateParams = Omit<IBlueprint, 'tenant' | 'created' | 'updated'>;

export default class QlManageBlueprints extends BaseSDK {
  private relativePath = '/api/blueprints';

  constructor(options: QelosSDKOptions) {
    super(options)
  }

  getBlueprint(key: string) {
    return this.callJsonApi<IBlueprint>(`${this.relativePath}/${key}`)
  }

  getList() {
    return this.callJsonApi<IBlueprint[]>(this.relativePath);
  }

  remove(key: string): Promise<any> {
    return this.callApi(`${this.relativePath}/${key}`, { method: 'delete' });
  }

  update(key: string, changes: Partial<IBlueprintUpdateParams>): Promise<IBlueprint> {
    return this.callJsonApi<IBlueprint>(
      `${this.relativePath}/${key}`,
      {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changes)
      }
    )
  }

  create(blueprint: IBlueprintUpdateParams): Promise<IBlueprint> {
    return this.callJsonApi<IBlueprint>(this.relativePath, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(blueprint)
    })
  }
}
