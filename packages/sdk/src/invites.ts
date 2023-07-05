import {QelosSDKOptions} from './types';
import BaseSDK from './base-sdk';

export interface IInvite {
  workspace: {
    name: string;
    logo?: string;
    _id: string;
  }
}

export enum InviteKind {
  DECLINE = 'decline',
  ACCEPT = 'accept',
}

export default class QlInvites extends BaseSDK {
  private relativePath = '/api/invites';

  constructor(options: QelosSDKOptions) {
    super(options)
  }

  getList() {
    return this.callJsonApi<IInvite[]>(this.relativePath);
  }

  acceptWorkspace(workspaceId: string): Promise<unknown> {
    return this.callApi(
      `${this.relativePath}/${workspaceId}`,
      {
        method: 'put',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          workspace: workspaceId,
          kind: InviteKind.ACCEPT
        })
      }
    )
  }

  declineWorkspace(workspaceId: string): Promise<unknown> {
    return this.callApi(
      `${this.relativePath}/${workspaceId}`,
      {
        method: 'put',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          workspace: workspaceId,
          kind: InviteKind.DECLINE
        })
      }
    )
  }
}
