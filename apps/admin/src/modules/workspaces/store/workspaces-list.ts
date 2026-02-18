import { useDispatcher } from '../../core/compositions/dispatcher'
import { useSubmitting } from '../../core/compositions/submitting'
import { useConfirmAction } from '../../core/compositions/confirm-action'
import { defineStore } from 'pinia';
import workspacesService from '@/services/apis/workspaces-service';
import { fetchAuthUser } from '@/modules/core/store/auth';
import { IWorkspace } from '@qelos/sdk/workspaces';
import pubsub from '@/services/pubsub';
import { api } from '@/services/apis/api';
import { isImpersonating, setImpersonation, impersonatedUser } from '@/modules/core/store/impersonation';
import { impersonateUser } from '@/services/sdk';

const useWorkspacesList = defineStore('workspaces-list', function useWorkspacesList() {
  const { result, retry, loading, promise } = useDispatcher<IWorkspace[]>(() => workspacesService.getAll(), [])

  const { submit: remove } = useSubmitting(
    (workspaceId: string) => {
      return workspacesService.remove(workspaceId)
    },
    {
      error: (err: any) => {
        return err?.response?.data?.message || 'Failed to removed workspace'
      },
      success: 'Workspace removed successfully'
    }, () => retry())

  const activateSilently = async (workspace: IWorkspace) => {
    // If impersonating, just update localStorage instead of making API call
    if (isImpersonating.value) {
      impersonateUser(impersonatedUser.value, {_id: workspace._id, name: workspace.name})
      fetchAuthUser(true).catch();
      return workspace;
    }
    
    // Use axios API instance which includes impersonation headers
    const res = await api.post(`/api/workspaces/${workspace._id}/activate`)
    if (!res.data) {
      throw new Error('failed');
    }
    fetchAuthUser(true).catch();
    return workspace;
  }

  const { submit: activate } = useSubmitting(activateSilently, {
    error: 'Failed to move to workspace',
    success: (workspace) => `You are now active on the workspace "${workspace.name}"`
  })

  pubsub.subscribe('workspaces:activateSilently', (workspaceId: string) => {
    return activateSilently({ _id: workspaceId } as any as IWorkspace)
  })

  pubsub.subscribe('workspaces:activate', (workspace: IWorkspace) => {
    return activate(workspace)
  })

  return { workspaces: result, reload: retry, remove: useConfirmAction(remove), activate, activateSilently, loading, promise }
})

export default useWorkspacesList;
