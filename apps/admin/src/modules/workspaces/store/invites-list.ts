import { useDispatcher } from '../../core/compositions/dispatcher'
import { useSubmitting } from '../../core/compositions/submitting'
import { useConfirmAction } from '../../core/compositions/confirm-action'
import {defineStore} from 'pinia';
import workspacesService from '@/services/workspaces-service';
import invitesService from '@/services/invites-service';

export enum InviteKind {
  DECLINE = 'decline',
  ACCEPT = 'accept',
}

const useInvitesList = defineStore('invites-list', function useMenusList() {
  const { result, retry } = useDispatcher(() => invitesService.getAll(), []);

  const respondToInvite = ({workspace, kind}: {workspace: string, kind: InviteKind}) => {
    return invitesService.create({
      workspace,
      kind
    });
  }

  return { invites: result, reload: retry, respondToInvite }
})

export default useInvitesList;
