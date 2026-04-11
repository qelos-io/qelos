import { QelosSDKOptions } from '../types';
import BaseSDK from '../base-sdk';
import { IWorkspace } from '../workspaces';

export default class QlAdminWorkspaces extends BaseSDK {
  private relativePath = '/api/workspaces';

  constructor(private options: QelosSDKOptions) {
    super(options)
  }

  getList(filters?: { 'members.user'?: string; labels?: string[]; name?: string; q?: string; _id?: string[]; select?: string }) {
    const queryParams = filters
      ? `?${Object.entries(filters)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) =>
          Array.isArray(value) ? `${key}=${value.join(',')}` : `${key}=${value}`
        ).join('&')}`
      : '';

    return this.callJsonApi<IWorkspace[]>(this.relativePath + '/all' + queryParams);
  }

  getEncryptedData<Z = any>(workspaceId: string, encryptedId: string = '') {
    return this.callJsonApi<Z>(`${this.relativePath}/${workspaceId}/encrypted`, {
      headers: {
        'x-encrypted-id': encryptedId
      }
    })
  }

  async setEncryptedData<Z = any>(workspaceId: string, encryptedId: string = '', data: Z): Promise<void> {
    const res = await this.callApi(`${this.relativePath}/${workspaceId}/encrypted`, {
      method: 'post',
      headers: { 'content-type': 'application/json', 'x-encrypted-id': encryptedId },
      body: JSON.stringify(data)
    })
    if (res.status >= 300) {
      throw new Error('could not set encrypted data')
    }
  }
}
