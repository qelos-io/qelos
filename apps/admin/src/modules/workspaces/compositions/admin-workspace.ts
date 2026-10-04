import { computed, ref, Ref, watch } from 'vue';
import workspacesService from '@/services/apis/workspaces-service';
import workspacesMembersService from '@/services/apis/workspaces-members-service';
import { getUserDisplayName } from '@/modules/users/services/display-name';

export interface WorkspaceMember {
  /** member entry id; the user id is `user` */
  _id: string;
  user: string;
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  created?: string;
}

export function memberName(member: WorkspaceMember) {
  return getUserDisplayName(member) || member.user;
}

/** One workspace with its members, as seen by an admin. */
export function useAdminWorkspace(workspaceId: Ref<string>) {
  const workspace = ref<any>(null);
  const members = ref<WorkspaceMember[]>([]);
  const loading = ref(true);
  const membersLoading = ref(true);
  const notFound = ref(false);
  const failed = ref(false);

  const adminsCount = computed(() => members.value.filter((member) => member.roles?.includes('admin')).length);

  async function loadWorkspace() {
    try {
      workspace.value = await workspacesService.getOne(workspaceId.value);
      notFound.value = false;
      failed.value = false;
    } catch (e: any) {
      workspace.value = null;
      notFound.value = e?.response?.status === 404;
      failed.value = !notFound.value;
    } finally {
      loading.value = false;
    }
  }

  async function loadMembers() {
    membersLoading.value = true;
    try {
      members.value = (await workspacesMembersService.getAll(workspaceId.value)) || [];
    } catch {
      members.value = [];
    } finally {
      membersLoading.value = false;
    }
  }

  const reload = () => Promise.all([loadWorkspace(), loadMembers()]);

  /** Saves a partial update and refreshes. Resolves to whether it succeeded. */
  async function save(patch: Record<string, unknown>) {
    await workspacesService.update(workspaceId.value, patch);
    await loadWorkspace();
  }

  watch(workspaceId, () => {
    loading.value = true;
    workspace.value = null;
    reload();
  }, { immediate: true });

  return {
    workspace, members, loading, membersLoading, notFound, failed, adminsCount,
    reload, loadWorkspace, loadMembers, save,
  };
}
