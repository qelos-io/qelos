import BaseSDK from '../base-sdk';
import { QelosSDKOptions } from '../types';

export interface IComponent {
  _id?: string;
  tenant?: string;
  identifier: string;
  componentName: string;
  description?: string;
  content: string;
  requiredProps: {
    prop: string;
    type: string;
  }[];
  compiledContent?: {
    js: string;
    css: string;
  };
  created: Date;
  updated: Date;
}

type IComponentCreateParams = Pick<IComponent, 'identifier' | 'componentName' | 'content'> & {
  description?: string;
};

interface IBulkComponentResult {
  identifier: string;
  success: boolean;
  component?: IComponent;
  error?: string;
}

interface IBulkComponentResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: IBulkComponentResult[];
}

type IComponentUpdateParams = Partial<Pick<IComponent, 'identifier' | 'componentName' | 'description' | 'content'>>;

export default class QlComponents extends BaseSDK {
  private relativePath = '/api/components';

  constructor(options: QelosSDKOptions) {
    super(options);
  }

  getComponent(componentId: string) {
    return this.callJsonApi<IComponent>(`${this.relativePath}/${componentId}`);
  }

  getList() {
    return this.callJsonApi<IComponent[]>(this.relativePath);
  }

  remove(componentId: string): Promise<IComponent> {
    return this.callJsonApi<IComponent>(`${this.relativePath}/${componentId}`, { method: 'delete' });
  }

  update(componentId: string, changes: IComponentUpdateParams): Promise<IComponent> {
    return this.callJsonApi<IComponent>(
      `${this.relativePath}/${componentId}`,
      {
        method: 'put',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(changes)
      }
    );
  }

  create(component: IComponentCreateParams): Promise<IComponent> {
    return this.callJsonApi<IComponent>(this.relativePath, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(component)
    });
  }

  bulkCreateOrUpdate(components: IComponentCreateParams[]): Promise<IBulkComponentResponse> {
    return this.callJsonApi<IBulkComponentResponse>(`${this.relativePath}/bulk`, {
      method: 'post',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ components })
    });
  }
}
