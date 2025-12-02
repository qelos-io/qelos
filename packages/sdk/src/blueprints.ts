import { QelosSDKOptions } from './types';
import BaseSDK from './base-sdk';
import type { IBlueprint } from '@qelos/global-types';
import QlBlueprintEntities from './blueprints-entities';

export default class QlBlueprints extends BaseSDK {
  private relativePath = '/api/blueprints';

  #entities = new Map<string, QlBlueprintEntities>();

  constructor(private options: QelosSDKOptions) {
    super(options)
  }

  getBlueprint(key: string) {
    return this.callJsonApi<IBlueprint>(`${this.relativePath}/${key}`)
  }

  getList() {
    return this.callJsonApi<IBlueprint[]>(this.relativePath);
  }

  entitiesOf<T = any>(blueprintKey: string): QlBlueprintEntities<T> {
    if (!this.#entities.has(blueprintKey)) {
      this.#entities.set(blueprintKey, new QlBlueprintEntities<T>(this.options, blueprintKey));
    }
    return this.#entities.get(blueprintKey);
  }

  getChart(blueprintKey: string, chartType: string, query?: Record<string, any>) {
    const qs = this.getQueryParams(query);
    return this.callJsonApi<Record<string, any>>(`${this.relativePath}/${blueprintKey}/charts/${chartType}${qs}`);
  }

  getPieChart(blueprintKey: string, query?: Record<string, any>) {
    const qs = this.getQueryParams(query);
    return this.callJsonApi<Record<string, any>>(`${this.relativePath}/${blueprintKey}/charts/pie${qs}`);
  }

  getCount(blueprintKey: string, query?: Record<string, any>) {
    const qs = this.getQueryParams(query);
    return this.callJsonApi<{ count: number }>(`${this.relativePath}/${blueprintKey}/charts/count${qs}`);
  }
}
