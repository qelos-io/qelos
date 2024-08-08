import { api, getCallData } from './api'

const workspacesMembersService = {
  getAll(workspaceId: string) {
    return api.get(`/api/workspaces/${workspaceId}/members`).then(getCallData)
  }
}

export default workspacesMembersService
