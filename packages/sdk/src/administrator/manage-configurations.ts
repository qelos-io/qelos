import {QelosSDKOptions} from '../types';
import BaseSDK from '../base-sdk';

export interface ICustomConfiguration<T = any> {
  key: string;
  public: boolean;
  kind?: string;
  description?: string;
  metadata: T
}

export default class QlManageConfigurations extends BaseSDK {
  private relativePath = '/api/configurations';

  constructor(options: QelosSDKOptions) {
    super(options);
  }

  getList(key: string, extra?: Partial<RequestInit>) {
    return this.callJsonApi<ICustomConfiguration[]>(this.relativePath, extra);
  }

  getConfiguration<T = any>(key: string, extra?: Partial<RequestInit>) {
    return this.callJsonApi<ICustomConfiguration<T>>(`${this.relativePath}/${key}`, extra);
  }

  create<T>(config: ICustomConfiguration<T>, extra?: Partial<RequestInit>) {
    return this.callJsonApi<ICustomConfiguration<T>>(this.relativePath, {
      method: 'post',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(config),
      ...(extra || {}),
    });
  }

  update<T>(key: string, changes: Partial<ICustomConfiguration<T>>, extra?: Partial<RequestInit>): Promise<ICustomConfiguration<T>> {
    return this.callJsonApi<ICustomConfiguration<T>>(`${this.relativePath}/${key}`, {
      method: 'put',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(changes),
      ...(extra || {}),
    });
  }

  remove(key: string, extra?: Partial<RequestInit>) {
    return this.callJsonApi(`${this.relativePath}/${key}`, {
      method: 'delete',
      ...(extra || {}),
    });
  }
}
