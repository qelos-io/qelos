<script lang="ts" setup>
defineOptions({ inheritAttrs: false });
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import workspacesService from '@/services/apis/workspaces-service';
import workspacesMembersService from '@/services/apis/workspaces-members-service';
import usersService from '@/services/apis/users-service';
import { getUserDisplayName } from '@/modules/users/services/display-name';
import { formatDate } from '@/modules/pricing-plans/services/pricing';
import { memberName } from '../compositions/admin-workspace';
import type { WorkspaceMember } from '../compositions/admin-workspace';

const props = defineProps<{
  workspace: any;
  members: WorkspaceMember[];
  membersLoading: boolean;
}>();
const emit = defineEmits<{ (e: 'refresh'): void; (e: 'refresh-members'): void }>();

const { t } = useI18n();

const DEFAULT_ROLES = ['admin', 'member', 'user'];
const roleOptions = computed(() => [...new Set([...DEFAULT_ROLES, ...props.members.flatMap((member) => member.roles || [])])]);

// ---- list ----
const search = ref('');
const rows = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (!query) return props.members;
  return props.members.filter((member) =>
    [memberName(member), member.email, ...(member.roles || [])].some((value) => value?.toLowerCase().includes(query))
  );
});

const initials = (member: WorkspaceMember) => memberName(member).slice(0, 2).toUpperCase();

// ---- edit roles ----
const editing = ref<WorkspaceMember | null>(null);
const editRoles = ref<string[]>([]);
const busy = ref(false);

function startEdit(member: WorkspaceMember) {
  editing.value = member;
  editRoles.value = [...(member.roles || [])];
}

async function guarded(action: () => Promise<unknown>, success: string, failure: string) {
  busy.value = true;
  try {
    await action();
    ElMessage.success(t(success));
    return true;
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || t(failure));
    return false;
  } finally {
    busy.value = false;
  }
}

async function saveRoles() {
  if (!editing.value) return;
  const member = editing.value;
  if (await guarded(
    () => workspacesMembersService.update(props.workspace._id, member.user, { roles: editRoles.value }),
    'Member updated successfully', 'Failed to update member',
  )) {
    editing.value = null;
    emit('refresh-members');
  }
}

async function removeMember(member: WorkspaceMember) {
  const last = props.members.length === 1;
  try {
    await ElMessageBox.confirm(
      last
        ? t('{name} is the last member. The workspace will have no members.', { name: memberName(member) })
        : t('Remove {name} from this workspace?', { name: memberName(member) }),
      t('Remove member'),
      { type: 'warning', confirmButtonText: t('Remove'), cancelButtonText: t('Cancel') },
    );
  } catch {
    return;
  }
  if (await guarded(
    () => workspacesMembersService.delete(props.workspace._id, member.user),
    'Member deleted successfully', 'Failed to delete member',
  )) emit('refresh');
}

// ---- add member ----
const addOpen = ref(false);
const addUserId = ref('');
const addRoles = ref<string[]>(['member']);
const userOptions = ref<{ value: string; label: string }[]>([]);
const searchingUsers = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

function openAdd() {
  addUserId.value = '';
  addRoles.value = ['member'];
  userOptions.value = [];
  addOpen.value = true;
}

function searchUsers(query: string) {
  clearTimeout(searchTimer);
  if (query.trim().length < 2) {
    userOptions.value = [];
    return;
  }
  searchTimer = setTimeout(async () => {
    searchingUsers.value = true;
    try {
      const memberIds = new Set(props.members.map((member) => member.user));
      const users = await usersService.getAll({
        username: query.trim(),
        select: '_id,username,email,firstName,lastName,fullName',
      });
      userOptions.value = users
        .filter((user) => !memberIds.has(user._id))
        .slice(0, 50)
        .map((user) => ({
          value: user._id,
          label: `${getUserDisplayName(user)}${user.email && user.email !== getUserDisplayName(user) ? ` (${user.email})` : ''}`,
        }));
    } catch {
      userOptions.value = [];
    } finally {
      searchingUsers.value = false;
    }
  }, 250);
}
onBeforeUnmount(() => clearTimeout(searchTimer));

async function addMember() {
  if (!addUserId.value) {
    ElMessage.warning(t('Select a user'));
    return;
  }
  if (await guarded(
    () => workspacesMembersService.add(props.workspace._id, addUserId.value, addRoles.value),
    'Member added successfully', 'Failed to add member',
  )) {
    addOpen.value = false;
    emit('refresh');
  }
}

// ---- invites ----
const invites = computed<any[]>(() => props.workspace.invites || []);
const inviteOpen = ref(false);
const inviteForm = reactive({ name: '', email: '', roles: ['member'] as string[] });
const inviteError = ref('');

function openInvite() {
  Object.assign(inviteForm, { name: '', email: '', roles: ['member'] });
  inviteError.value = '';
  inviteOpen.value = true;
}

const saveInvites = (next: any[]) => workspacesService.update(props.workspace._id, { invites: next });

async function sendInvite() {
  const email = inviteForm.email.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    inviteError.value = t('Enter a valid email address');
    return;
  }
  if (invites.value.some((invite) => invite.email?.toLowerCase() === email.toLowerCase())) {
    inviteError.value = t('This email is already invited');
    return;
  }
  if (await guarded(
    () => saveInvites([...invites.value, { name: inviteForm.name.trim(), email, roles: inviteForm.roles }]),
    'Invite added', 'Failed to update invites',
  )) {
    inviteOpen.value = false;
    emit('refresh');
  }
}

async function revokeInvite(invite: any) {
  try {
    await ElMessageBox.confirm(
      t('Revoke the invitation for {name}?', { name: invite.email || invite.name || invite.phone }),
      t('Revoke invite'),
      { type: 'warning', confirmButtonText: t('Revoke'), cancelButtonText: t('Cancel') },
    );
  } catch {
    return;
  }
  if (await guarded(
    () => saveInvites(invites.value.filter((item) => item !== invite)),
    'Invite revoked', 'Failed to update invites',
  )) emit('refresh');
}
</script>

<template>
  <div class="members-tab">
    <el-card shadow="never">
      <template #header>
        <div class="card-title">
          <span>{{ t('Members') }} <small class="muted">({{ members.length }})</small></span>
          <span class="card-actions">
            <el-input v-model="search" clearable :placeholder="t('Search by name, email or role')" class="search-input">
              <template #prefix><font-awesome-icon :icon="['fas', 'magnifying-glass']" /></template>
            </el-input>
            <el-button :loading="membersLoading" :aria-label="t('Refresh')" @click="emit('refresh-members')">
              <font-awesome-icon :icon="['fas', 'rotate']" />
            </el-button>
            <el-button type="primary" @click="openAdd">{{ t('Add Member') }}</el-button>
          </span>
        </div>
      </template>

      <el-table v-loading="membersLoading" :data="rows" row-key="user" :empty-text="search ? t('No matching members') : t('No members yet')">
        <el-table-column :label="t('Member')" min-width="240">
          <template #default="{ row }">
            <div class="member-cell">
              <el-avatar :size="32">{{ initials(row) }}</el-avatar>
              <div class="member-text">
                <router-link :to="{ name: 'editUser', params: { userId: row.user } }" class="member-name">{{ memberName(row) }}</router-link>
                <small v-if="row.email" class="muted">{{ row.email }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('Roles')" min-width="180">
          <template #default="{ row }">
            <el-tag v-for="role in row.roles" :key="role" size="small" effect="light" class="role-tag">{{ role }}</el-tag>
            <span v-if="!row.roles?.length" class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('Joined')" width="130">
          <template #default="{ row }">{{ formatDate(row.created) }}</template>
        </el-table-column>
        <el-table-column :label="t('Actions')" width="190" align="end">
          <template #default="{ row }">
            <el-button size="small" @click="startEdit(row)">{{ t('Edit roles') }}</el-button>
            <el-button size="small" type="danger" plain :aria-label="t('Remove')" @click="removeMember(row)">
              <font-awesome-icon :icon="['fas', 'trash']" />
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>
        <div class="card-title">
          <span>{{ t('Pending invites') }} <small class="muted">({{ invites.length }})</small></span>
          <el-button size="small" @click="openInvite">{{ t('Invite by email') }}</el-button>
        </div>
      </template>
      <el-table v-if="invites.length" :data="invites" size="small">
        <el-table-column :label="t('Invitee')" min-width="200">
          <template #default="{ row }">
            <strong v-if="row.name">{{ row.name }}</strong>
            <small class="muted block">{{ row.email || row.phone }}</small>
          </template>
        </el-table-column>
        <el-table-column :label="t('Roles')" min-width="140">
          <template #default="{ row }">
            <el-tag v-for="role in row.roles" :key="role" size="small" effect="light" class="role-tag">{{ role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('Invited')" width="130">
          <template #default="{ row }">{{ formatDate(row.created) }}</template>
        </el-table-column>
        <el-table-column width="110" align="end">
          <template #default="{ row }">
            <el-button size="small" type="danger" plain @click="revokeInvite(row)">{{ t('Revoke') }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else :image-size="60" :description="t('No pending invitations')" />
    </el-card>

    <!-- edit roles -->
    <el-dialog :model-value="!!editing" :title="t('Edit roles')" width="440px" @update:model-value="editing = null">
      <p v-if="editing" class="dialog-subject">{{ memberName(editing) }}</p>
      <el-select v-model="editRoles" multiple filterable allow-create default-first-option clearable
        :placeholder="t('Add or select roles')" style="width: 100%;">
        <el-option v-for="role in roleOptions" :key="role" :label="role" :value="role" />
      </el-select>
      <template #footer>
        <el-button @click="editing = null">{{ t('Cancel') }}</el-button>
        <el-button type="primary" :loading="busy" @click="saveRoles">{{ t('Save') }}</el-button>
      </template>
    </el-dialog>

    <!-- add member -->
    <el-drawer v-model="addOpen" :title="t('Add Member')" size="min(440px, 100vw)">
      <el-form label-position="top" @submit.prevent="addMember">
        <el-form-item :label="t('User')" required>
          <el-select v-model="addUserId" filterable remote reserve-keyword :remote-method="searchUsers" :loading="searchingUsers"
            :placeholder="t('Search users by username or email')" style="width: 100%;">
            <el-option v-for="option in userOptions" :key="option.value" :label="option.label" :value="option.value" />
            <template #empty>{{ t('Type at least 2 characters to search') }}</template>
          </el-select>
        </el-form-item>
        <el-form-item :label="t('Roles')">
          <el-select v-model="addRoles" multiple filterable allow-create default-first-option clearable style="width: 100%;">
            <el-option v-for="role in roleOptions" :key="role" :label="role" :value="role" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addOpen = false">{{ t('Cancel') }}</el-button>
        <el-button type="primary" :loading="busy" :disabled="!addUserId" @click="addMember">{{ t('Add Member') }}</el-button>
      </template>
    </el-drawer>

    <!-- invite -->
    <el-dialog v-model="inviteOpen" :title="t('Invite by email')" width="440px">
      <el-form label-position="top" @submit.prevent="sendInvite">
        <el-form-item :label="t('Email')" required :error="inviteError">
          <el-input v-model="inviteForm.email" type="email" dir="ltr" placeholder="name@company.com" @input="inviteError = ''" />
        </el-form-item>
        <el-form-item :label="t('Name')">
          <el-input v-model="inviteForm.name" />
        </el-form-item>
        <el-form-item :label="t('Roles')">
          <el-select v-model="inviteForm.roles" multiple filterable allow-create default-first-option style="width: 100%;">
            <el-option v-for="role in roleOptions" :key="role" :label="role" :value="role" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inviteOpen = false">{{ t('Cancel') }}</el-button>
        <el-button type="primary" :loading="busy" @click="sendInvite">{{ t('Invite') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.members-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.search-input {
  inline-size: 260px;
}

.muted {
  color: var(--el-text-color-secondary);
}

.block {
  display: block;
}

.member-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.member-text {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.member-name {
  font-weight: 500;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.role-tag {
  margin-inline-end: 4px;
}

.dialog-subject {
  margin-block: 0 12px;
  font-weight: 500;
}
</style>
