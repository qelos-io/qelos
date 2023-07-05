import { useDispatcher } from '../../core/compositions/dispatcher'
import { useSubmitting } from '../../core/compositions/submitting'
import { useConfirmAction } from '../../core/compositions/confirm-action'
import {defineStore} from 'pinia';
import workspacesService from '@/services/workspaces-service';

const useWorkspacesList = defineStore('workspaces-list', function useMenusList() {
  const { result, retry } = useDispatcher(() => workspacesService.getAll(), [])

  const { submit: remove } = useSubmitting(
    (name) => workspacesService.remove(name),
    {
      error: 'Failed to remove workspace',
      success: 'Workspace removed successfully'
    })

  return { workspaces: result, reload: retry, remove: useConfirmAction(remove) }
})

export default useWorkspacesList;
