import { QelosSDKOptions, RequestExtra } from '../types';
import BaseSDK from '../base-sdk';
import { IIntegration } from '@qelos/global-types';

export default class QlIntegrations extends BaseSDK {
  private relativePath = '/api/integrations';

  constructor(private options: QelosSDKOptions) {
    super(options)
  }

  getIntegration(integrationId: string, extra?: RequestExtra) {
    return this.callJsonApi<IIntegration>(`${this.relativePath}/${integrationId}`, extra);
  }

  getList(query?: { 
    plugin?: string;
    user?: string;
    'trigger.source'?: string;
    'target.source'?: string;
    'trigger.kind'?: string;
    'target.kind'?: string;
    kind?: string;
    source?: string;
    active?: boolean;
    id?: string;
    _id?: string;
  }, extra?: RequestExtra) {
    return this.callJsonApi<IIntegration[]>(this.relativePath + this.getQueryParams(query), extra);
  }

  remove(integrationId: string): Promise<any> {
    return this.callApi(`${this.relativePath}/${integrationId}`, { method: 'delete' });
  }

  update(integrationId: string, changes: {
    active?: boolean;
    trigger?: any;
    target?: any;
    dataManipulation?: any;
  }): Promise<IIntegration> {
    return this.callJsonApi<IIntegration>(
      `${this.relativePath}/${integrationId}`,
      {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changes)
      }
    )
  }

  create(integration: {
    trigger: any;
    target: any;
    dataManipulation?: any;
    active?: boolean;
  }): Promise<IIntegration> {
    return this.callJsonApi<IIntegration>(this.relativePath, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(integration)
    })
  }

}
