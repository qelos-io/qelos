import { useDispatcher } from '../../core/compositions/dispatcher';
import { useSubmitting } from '../../core/compositions/submitting';
import { useConfirmAction } from '../../core/compositions/confirm-action';
import { defineStore } from 'pinia';
import workspacesService from '@/services/workspaces-service';
import { IWorkspace } from '@qelos/sdk/dist/workspaces';

const useAdminWorkspacesList = defineStore('admin-workspaces-list', function useAdminWorkspacesList() {

  const { result, retry, loading } = useDispatcher<IWorkspace[]>(async () => {
    const workspaces = await workspacesService.getOne('all');

    // Add is PrivilegedUser property for each workspace
    return workspaces.map(workspace => ({
      ...workspace,
  
    }));
  }, []);

  const { submit: remove } = useSubmitting(
    (workspaceId: string) => workspacesService.remove(workspaceId),
    {
      error: 'Failed to remove workspace',
      success: 'Workspace removed successfully'
    }
  );

  return { workspaces: result, reload: retry, remove: useConfirmAction(remove), loading };
});

export default useAdminWorkspacesList;

