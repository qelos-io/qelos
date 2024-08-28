import { api, getCallData } from './api'

const workspacesMembersService = {
  getAll(workspaceId: string) {
    return api.get(`/api/workspaces/${workspaceId}/members`).then(res => {
      if (res.status === 403) {
        return null;
      }
      return getCallData(res);
    })
  }
}

export default workspacesMembersService
