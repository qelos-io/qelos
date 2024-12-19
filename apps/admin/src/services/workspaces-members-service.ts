import { api, getCallData } from './api'

const workspacesMembersService = {
  getAll(workspaceId: string) {
    return api.get(`/api/workspaces/${workspaceId}/members`).then(res => {
      if (res.status === 403) {
        return null;
      }
      return getCallData(res);
    })
  },

  add(workspaceId: string, userId: string, roles: string[]) {
    const memberData = { userId, roles };

    return api.post(`/api/workspaces/${workspaceId}/members`, memberData).then(res => {
      if (res.status === 403) {
        throw new Error('Forbidden');

      }
      return getCallData(res);
    }).catch(err => {
      throw err;
    });
  },

  delete(workspaceId: string, userId: string) {
    return api.delete(`/api/workspaces/${workspaceId}/members/${userId}`).then(res => {
      if (res.status === 403) {
        throw new Error('Forbidden');
      }
      return getCallData(res);
    }).catch(err => {
         throw err;
    });
  },

  update(workspaceId: string, userId: string, memberData: { roles: string[] }) {
    return api.put(`/api/workspaces/${workspaceId}/members/${userId}`, memberData).then(res => {
      if (res.status === 403) {
        throw new Error('Forbidden');
      }
      return getCallData(res);
    }).catch(err => {
      throw err;
    });
  },
}

export default workspacesMembersService

