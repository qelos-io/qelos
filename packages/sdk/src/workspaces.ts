import {QelosSDKOptions} from './types';
import BaseSDK from './base-sdk';

export interface IWorkspaceMember {
  user: string;
  roles: string[];
  created?: string | Date;
}

export interface IInvite {
  _id?: string;
  name?: string;
  email: string;
  phone?: string;
  roles?: string[];
  created?: string | Date;
}

export interface IWorkspace {
  name: string;
  logo?: string;
  isPrivilegedUser?: boolean;

  members?: IWorkspaceMember[];
  invites?: IInvite[];
  labels: string[]

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

  getMembers(workspaceId: string) {
    return this.callJsonApi<IWorkspaceMember[]>(`${this.relativePath}/${workspaceId}/members`)
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

  activate(workspaceId: string): Promise<IWorkspace> {
    return this.callJsonApi<IWorkspace>(
      `${this.relativePath}/${workspaceId}/activate`,
      {
        method: 'post',
        headers: {'content-type': 'application/json'},
      }
    )
  }

  async inviteUser(
    workspaceId: string,
    email: string,
    roles?: string[]
  ): Promise<IWorkspace> {
    const ws = await this.getWorkspace(workspaceId);
    const inviteRoles = roles && roles.length > 0 ? roles : ['member'];
    const invites: IInvite[] = [...(ws.invites || [])];
    const normalized = email.trim().toLowerCase();
    const index = invites.findIndex((i) => (i.email || '').trim().toLowerCase() === normalized);
    if (index >= 0) {
      invites[index] = {...invites[index], email: invites[index].email || email, roles: inviteRoles};
    } else {
      invites.push({email, roles: inviteRoles});
    }
    return this.update(workspaceId, {invites});
  }

  removeMember(workspaceId: string, userId: string): Promise<{
    message: string;
    removedMemberId?: string;
    userId?: string;
  }> {
    const path = `${this.relativePath}/${workspaceId}/members/${encodeURIComponent(userId)}`;
    return this.callJsonApi(path, {method: 'delete'});
  }

  updateMemberRoles(
    workspaceId: string,
    userId: string,
    roles: string[]
  ): Promise<{
    message: string;
    updatedMember?: IWorkspaceMember;
    workspaceId?: string;
  }> {
    const path = `${this.relativePath}/${workspaceId}/members/${encodeURIComponent(userId)}`;
    return this.callJsonApi(path, {
      method: 'put',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({roles}),
    });
  }

  async listInvites(workspaceId: string): Promise<IInvite[]> {
    const ws = await this.getWorkspace(workspaceId);
    return ws.invites ?? [];
  }

  async revokeInvite(workspaceId: string, inviteId: string): Promise<IWorkspace> {
    const ws = await this.getWorkspace(workspaceId);
    const prev = ws.invites || [];
    const idStr = String(inviteId);
    const invites = prev.filter((inv) => String(inv._id ?? '') !== idStr);
    if (invites.length === prev.length) {
      throw new Error('Invitation not found');
    }
    return this.update(workspaceId, {invites});
  }
}
