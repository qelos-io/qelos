import { QelosSDKOptions, RequestExtra } from '../types';
import BaseSDK from '../base-sdk';
import { IIntegrationSource } from '@qelos/global-types';

export default class QlIntegrationSources extends BaseSDK {
  private relativePath = '/api/integration-sources';

  constructor(private options: QelosSDKOptions) {
    super(options)
  }

  getIntegrationSource(sourceId: string, extra?: RequestExtra) {
    return this.callJsonApi<IIntegrationSource>(`${this.relativePath}/${sourceId}`, extra);
  }

  getList(query?: { kind?: string }, extra?: RequestExtra) {
    return this.callJsonApi<IIntegrationSource[]>(this.relativePath + this.getQueryParams(query), extra);
  }

  remove(sourceId: string): Promise<any> {
    return this.callApi(`${this.relativePath}/${sourceId}`, { method: 'delete' });
  }

  update(sourceId: string, changes: Partial<Pick<IIntegrationSource, 'name' | 'labels' | 'metadata' | 'authentication'>>): Promise<IIntegrationSource> {
    return this.callJsonApi<IIntegrationSource>(
      `${this.relativePath}/${sourceId}`,
      {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changes)
      }
    )
  }

  create(source: Pick<IIntegrationSource, 'name' | 'labels' | 'metadata' | 'authentication'>): Promise<IIntegrationSource> {
    return this.callJsonApi<IIntegrationSource>(this.relativePath, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(source)
    })
  }

}
