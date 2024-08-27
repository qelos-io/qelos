import { useDispatcher } from '../../core/compositions/dispatcher'
import { useSubmitting } from '../../core/compositions/submitting'
import { useConfirmAction } from '../../core/compositions/confirm-action'
import { defineStore } from 'pinia';
import workspacesService from '@/services/workspaces-service';
import { fetchAuthUser } from '@/modules/core/store/auth';
import { IWorkspace } from '@qelos/sdk/dist/workspaces';

const useWorkspacesList = defineStore('workspaces-list', function useWorkspacesList() {
  const { result, retry, loading } = useDispatcher<IWorkspace[]>(() => workspacesService.getAll(), [])

  const { submit: remove } = useSubmitting(
    (workspaceId: string) => workspacesService.remove(workspaceId),
    {
      error: 'Failed to remove workspace',
      success: 'Workspace removed successfully'
    })

  const activateSilently = async (workspace: IWorkspace) => {
    const res = await fetch(`/api/workspaces/${workspace._id}/activate`, { method: 'POST' })
    if (!res.ok) {
      throw new Error('failed');
    }
    fetchAuthUser(true).catch();
    return workspace;
  }

  const { submit: activate } = useSubmitting(activateSilently, {
      error: 'Filed to move to workspace',
      success: (workspace) => `You are now active on the workspace "${workspace.name}"`
    })

  return { workspaces: result, reload: retry, remove: useConfirmAction(remove), activate, activateSilently, loading }
})

export default useWorkspacesList;
