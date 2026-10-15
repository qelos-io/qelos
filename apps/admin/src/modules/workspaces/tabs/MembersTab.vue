<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, MoreFilled, Plus } from '@element-plus/icons-vue';
import { useWorkspaceMembers } from '../compositions/workspaces';
import { useAuth } from '@/modules/core/compositions/authentication';
import workspacesMembersService from '@/services/apis/workspaces-members-service';
import workspacesService from '@/services/apis/workspaces-service';
import UserAvatar from '@/modules/users/components/UserAvatar.vue';
import { getUserDisplayName } from '@/modules/users/services/display-name';
import { roleTagType } from '@/modules/users/services/user-presentation';
import { cleanInvites } from '../services/workspace-presentation';

defineOptions({ inheritAttrs: false });
const props = defineProps<{ workspaceId: string; workspace?: any }>();
const emit = defineEmits<{ (e: 'refresh-workspace'): void }>();

const { t } = useI18n();
const { user } = useAuth();
const { load, members, loaded } = useWorkspaceMembers(props.workspaceId);

// the same rule as before: managing people is for admins
const canManage = computed(() => !!user.value?.roles?.includes('admin'));
const ROLES = computed(() => [
  { label: t('Member'), value: 'member' },
  { label: t('Manager'), value: 'manager' },
  { label: t('Admin'), value: 'admin' },
]);

onMounted(load);

const name = (member: any) => getUserDisplayName(member) || member.email || '';

/* ---- people ---- */
const editing = ref<any>(null);
const editRoles = ref<string[]>([]);
const saving = ref(false);

function startEdit(member: any) {
  editing.value = member;
  editRoles.value = [...(member.roles || [])];
}

async function saveRoles() {
  if (!editing.value) return;
  saving.value = true;
  try {
    await workspacesMembersService.update(props.workspaceId, editing.value.user, { roles: editRoles.value });
    ElMessage.success(t('Member updated successfully'));
    editing.value = null;
    load();
  } catch {
    ElMessage.error(t('Failed to update member'));
  } finally {
    saving.value = false;
  }
}

async function removeMember(member: any) {
  try {
    await ElMessageBox.confirm(t('Remove {name} from this workspace?', { name: name(member) }), t('Remove member'), { type: 'warning', confirmButtonText: t('Remove'), cancelButtonText: t('Cancel') });
  } catch {
    return;
  }
  try {
    await workspacesMembersService.delete(props.workspaceId, member.user);
    ElMessage.success(t('Member deleted successfully'));
    load();
    emit('refresh-workspace');
  } catch {
    ElMessage.error(t('Failed to delete member'));
  }
}

/* ---- invites ---- */
type Invite = { name?: string; email: string; roles: string[] };
const fromWorkspace = (): Invite[] => (props.workspace?.invites || []).map((invite: any) => ({ name: invite.name || '', email: invite.email || '', roles: invite.roles?.length ? [...invite.roles] : ['member'] }));
const invites = ref<Invite[]>(fromWorkspace());
const baseline = ref(JSON.stringify(invites.value));
const invitesDirty = computed(() => JSON.stringify(invites.value) !== baseline.value);
const sending = ref(false);

const addInvite = () => invites.value.push({ name: '', email: '', roles: ['member'] });
const removeInvite = (index: number) => invites.value.splice(index, 1);

async function sendInvites() {
  const valid = cleanInvites(invites.value);
  if (!valid.length && invites.value.length) {
    ElMessage.warning(t('Please add at least one valid email address'));
    return;
  }
  sending.value = true;
  try {
    await workspacesService.update(props.workspaceId, { invites: valid } as any);
    invites.value = valid.map((invite) => ({ ...invite, name: invite.name || '' }));
    baseline.value = JSON.stringify(invites.value);
    ElMessage.success(valid.length ? t('Invites saved') : t('Invites cleared'));
    emit('refresh-workspace');
  } catch {
    ElMessage.error(t('Failed to send invites. Please try again.'));
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <div class="members">
    <section aria-labelledby="people-title">
      <h2 id="people-title">{{ $t('People') }} <small>{{ members?.length || 0 }}</small></h2>
      <el-skeleton v-if="!loaded" animated :rows="2" />
      <p v-else-if="!members?.length" class="empty">{{ $t('No members in this workspace yet') }}</p>
      <ul v-else class="rows">
        <li v-for="member in members" :key="member.user" class="row">
          <UserAvatar :name="name(member)" :size="36" />
          <div class="who">
            <span class="name" dir="auto">{{ name(member) }}</span>
            <span class="email" dir="ltr">{{ member.email }}</span>
          </div>
          <div class="roles"><el-tag v-for="role in member.roles" :key="role" size="small" :type="roleTagType(role)" effect="light">{{ role }}</el-tag></div>
          <el-dropdown v-if="canManage" trigger="click">
            <el-button text circle :aria-label="`${$t('Actions')}: ${name(member)}`"><el-icon><MoreFilled /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="Edit" @click="startEdit(member)">{{ $t('Edit roles') }}</el-dropdown-item>
                <el-dropdown-item :icon="Delete" divided @click="removeMember(member)">{{ $t('Remove') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </li>
      </ul>
    </section>

    <section v-if="canManage" aria-labelledby="invites-title">
      <h2 id="invites-title">{{ $t('Invite by email') }}</h2>
      <p class="hint">{{ $t('People you list here can accept the invitation when they sign in.') }}</p>
      <ul v-if="invites.length" class="invites">
        <li v-for="(invite, index) in invites" :key="index">
          <el-input v-model="invite.name" dir="auto" :placeholder="$t('Name')" :aria-label="$t('Name')" />
          <el-input v-model="invite.email" dir="ltr" type="email" :placeholder="$t('Email')" :aria-label="$t('Email')" />
          <el-select v-model="invite.roles" multiple :aria-label="$t('Roles')" class="roles-select">
            <el-option v-for="role in ROLES" :key="role.value" :label="role.label" :value="role.value" />
          </el-select>
          <el-button text circle :icon="Delete" :aria-label="$t('Remove')" @click="removeInvite(index)" />
        </li>
      </ul>
      <div class="invite-actions">
        <el-button :icon="Plus" @click="addInvite">{{ invites.length ? $t('Add another') : $t('Add an invite') }}</el-button>
        <el-button v-if="invitesDirty" type="primary" :loading="sending" @click="sendInvites">{{ $t('Save invites') }}</el-button>
      </div>
    </section>

    <el-dialog :model-value="!!editing" :title="$t('Edit roles')" width="400px" append-to-body align-center @close="editing = null">
      <p v-if="editing" class="dialog-name" dir="auto">{{ name(editing) }}</p>
      <el-select v-model="editRoles" multiple :placeholder="$t('Select roles')" class="full">
        <el-option v-for="role in ROLES" :key="role.value" :label="role.label" :value="role.value" />
      </el-select>
      <template #footer>
        <el-button @click="editing = null">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="saveRoles">{{ $t('Save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.members {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

h2 {
  margin: 0 0 10px;
  padding: 0;
  font-size: 1.15rem;

  small {
    margin-inline-start: 6px;
    color: var(--el-text-color-secondary);
    font-weight: 400;
  }
}

.hint,
.empty {
  margin: 0 0 12px;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  text-align: start;
}

.rows,
.invites {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--surface, var(--el-bg-color));
}

.who {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.email {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  text-align: start;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.invites li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) minmax(130px, 0.9fr) auto;
  align-items: center;
  gap: 8px;
}

.invite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-start: 12px;
}

.dialog-name {
  margin: 0 0 12px;
  padding: 0;
  font-weight: 600;
  text-align: start;
}

.full {
  inline-size: 100%;
}

@media (max-width: 720px) {
  .row {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: 'avatar who menu' '. roles roles';
    row-gap: 6px;

    > :nth-child(1) { grid-area: avatar; }
    > .who { grid-area: who; }
    > .roles { grid-area: roles; }
    > :last-child { grid-area: menu; }

    :deep(.el-button.is-circle) {
      inline-size: 40px;
      block-size: 40px;
    }
  }

  .invites li {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'name remove' 'email email' 'roles roles';

    > :nth-child(1) { grid-area: name; }
    > :nth-child(2) { grid-area: email; }
    > :nth-child(3) { grid-area: roles; }
    > :nth-child(4) { grid-area: remove; }
  }
}
</style>
