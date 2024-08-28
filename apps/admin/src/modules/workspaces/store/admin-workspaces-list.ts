import { useDispatcher } from '../../core/compositions/dispatcher'
import { useSubmitting } from '../../core/compositions/submitting'
import { useConfirmAction } from '../../core/compositions/confirm-action'
import { defineStore } from 'pinia';
import workspacesService from '@/services/workspaces-service';
import { fetchAuthUser } from '@/modules/core/store/auth';

const useAdminWorkspacesList = defineStore('admin-workspaces-list', function useAdminWorkspacesList() {
  const { result, retry, loading } = useDispatcher(() => workspacesService.getOne('all'), [])

  const { submit: remove } = useSubmitting(
    (name) => workspacesService.remove(name),
    {
      error: 'Failed to remove workspace',
      success: 'Workspace removed successfully'
    })

  return { workspaces: result, reload: retry, remove: useConfirmAction(remove), loading }
})

export default useAdminWorkspacesList;
