import workspacesService from '@/services/workspaces-service';
import { useSubmitting } from '../../core/compositions/submitting';
import { useDispatcher } from '@/modules/core/compositions/dispatcher';
import { IWorkspace } from '@qelos/sdk/dist/workspaces';
import workspacesMembersService from '@/services/workspaces-members-service';

export function useCreateWorkspace() {
  const { submit, submitting } = useSubmitting(workspacesService.create, {
    success: 'Workspace created successfully',
    error: 'Failed to create Workspace',
  });
  return {
    createWorkspace: submit,
    submitting,
  };
}


export function useUpdateWorkspace(workspaceId: string) {
  const { result: workspace, loaded } = useDispatcher<IWorkspace>(() => workspacesService.getOne(workspaceId));

  const {
    submit,
    submitting
  } = useSubmitting((data: Partial<IWorkspace>) => workspacesService.update(workspaceId, data), {
    success: 'Workspace updated successfully',
    error: 'Failed to update Workspace',
  });
  return {
    updateWorkspace: submit,
    submitting,
    workspace,
    loaded
  };
}

export function useWorkspaceMembers(workspaceId: string) {
  const { result: members, loaded, retry } = useDispatcher<any[]>(() => workspacesMembersService.getAll(workspaceId), null, true);

  return {
    members,
    loaded,
    load: retry,
  }

}
