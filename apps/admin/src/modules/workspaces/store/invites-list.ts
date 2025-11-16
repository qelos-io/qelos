import { useDispatcher } from '../../core/compositions/dispatcher'
import { defineStore } from 'pinia';
import invitesService from '@/services/apis/invites-service';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';

export enum InviteKind {
  DECLINE = 'decline',
  ACCEPT = 'accept',
}

const useInvitesList = defineStore('invites-list', function useInvitesList() {
  const { result, retry, promise } = useDispatcher(() => invitesService.getAll(), []);

  const workspaces = useWorkspacesList();

  const respondToInvite = ({ workspace, kind }: { workspace: string, kind: InviteKind }) => {
    return invitesService.create({
      workspace,
      kind
    }).finally(() => {
      workspaces.reload()
      retry();
      workspaces.activate({ _id: workspace })
    });
  }

  return { invites: result, reload: retry, respondToInvite, promise }
})

export default useInvitesList;
