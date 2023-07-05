import {QelosSDKOptions} from './types';
import BaseSDK from './base-sdk';

export interface IWorkspaceMember {
  user: string;
  roles: string[];
  created?: string | Date;
}

export interface IInvite {
  email: string;
  created?: string | Date;
}

export interface IWorkspace {
  name: string;
  logo?: string;
  isPrivilegedUser?: boolean;

  members?: IWorkspaceMember[];
  invites?: IInvite[];

  [key: string]: any;
}

export default class QlWorkspaces extends BaseSDK {
  private relativePath = '/api/workspaces';

  constructor(options: QelosSDKOptions) {
    super(options)
  }

  getWorkspace(workspaceId: string) {
    return this.callJsonApi<IWorkspace>(`${this.relativePath}/${workspaceId}`)
  }

  getList() {
    return this.callJsonApi<IWorkspace[]>(this.relativePath);
  }

  remove(workspaceId: string): Promise<any> {
    return this.callApi(`${this.relativePath}/${workspaceId}`, {method: 'delete'});
  }

  update(workspaceId: string, changes: Partial<IWorkspace>): Promise<IWorkspace> {
    return this.callJsonApi<IWorkspace>(
      `${this.relativePath}/${workspaceId}`,
      {
        method: 'put',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(changes)
      }
    )
  }

  create(workspace: Partial<IWorkspace> & { name: string }): Promise<IWorkspace> {
    return this.callJsonApi<IWorkspace>(this.relativePath, {
      method: 'post',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(workspace)
    })
  }
}
