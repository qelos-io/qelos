<template>
  <div class="members-tab">
    <!-- Invite Section -->
    <el-card class="invite-card" shadow="hover" v-if="canInviteMembers">
      <template #header>
        <div class="card-header">
          <h2>{{ $t('Invite Members') }}</h2>
          <p class="subtitle">{{ $t('Add people to your workspace by email') }}</p>
        </div>
      </template>
      
      <div class="invites-list">
        <el-empty 
          v-if="invites.length === 0" 
          :description="$t('No invites added yet')"
          :image-size="100"
        >
          <template #default>
            <el-button type="primary" @click="addInvite">
              <font-awesome-icon :icon="['fas', 'user-plus']" class="icon-left" />
              {{ $t('Add First Member') }}
            </el-button>
          </template>
        </el-empty>
        
        <div v-else>
          <el-form :model="{ invites }" ref="invitesFormRef" @submit.prevent>
            <el-table :data="invites" style="width: 100%" class="invites-table">
              <el-table-column prop="name" :label="$t('Name')" min-width="180">
                <template #default="{ row }">
                  <el-input 
                    v-model="row.name" 
                    :placeholder="$t('Enter name')"
                    size="default"
                  />
                </template>
              </el-table-column>
              
              <el-table-column prop="email" :label="$t('Email')" min-width="220">
                <template #default="{ row }">
                  <el-input 
                    v-model="row.email" 
                    :placeholder="$t('Enter email address')"
                    type="email"
                    size="default"
                  />
                </template>
              </el-table-column>
              
              <el-table-column prop="role" :label="$t('Role')" width="200" v-if="isAdmin">
                <template #default="{ row }">
                  <el-select v-model="row.roles" multiple :placeholder="$t('Select role')">
                    <el-option
                      v-for="role in availableRoles"
                      :key="role.value"
                      :label="role.label"
                      :value="role.value"
                    />
                  </el-select>
                </template>
              </el-table-column>
              
              <el-table-column width="80">
                <template #default="{ $index }">
                  <el-button 
                    type="danger" 
                    circle 
                    @click="removeInvite($index)"
                    size="small"
                  >
                    <font-awesome-icon :icon="['fas', 'trash']" />
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-form>
        </div>
        
        <!-- Always show actions if user can invite members -->
        <div class="invites-actions" v-if="canInviteMembers">
          <el-button @click="addInvite" type="success" plain size="default">
            <font-awesome-icon :icon="['fas', 'user-plus']" class="icon-left" />
            {{ invites.length === 0 ? $t('Add First Member') : $t('Add Another Member') }}
          </el-button>
          <el-button class="flex-end" @click="sendInvites" type="primary" :loading="sendingInvites">
            <font-awesome-icon :icon="['fas', 'paper-plane']" class="icon-left" />
            {{ $t('Update Invites List') }}
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- Members List -->
    <el-card class="members-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <h2>{{ $t('Workspace Members') }}</h2>
          <p class="subtitle">{{ $t('People with access to this workspace') }}</p>
          <div class="header-actions">
            <el-button v-if="isAdmin" @click="refreshMembers" :loading="!loaded">
              <font-awesome-icon :icon="['fas', 'refresh']" class="icon-left" />
              {{ $t('Refresh') }}
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="members-list">
        <el-empty v-if="!loaded && (!members || members.length === 0)" :description="$t('No members in this workspace yet')" />
        <el-skeleton v-else-if="!loaded" :rows="5" animated />
        <QuickTable v-else :data="members" :columns="membersColumns">
          <template #lastName="{ row }">
            {{ decodeURIComponent(row.lastName) }}
          </template>
          <template #firstName="{ row }">
            {{ decodeURIComponent(row.firstName) }}
          </template>
          <template #roles="{ row }">
            <el-tag v-for="role in row.roles" :key="role" size="small" class="role-tag">
              {{ role }}
            </el-tag>
          </template>
          <template #actions="{ row }" v-if="isAdmin">
            <el-dropdown @command="(command) => handleMemberAction(command, row)">
              <el-button type="primary" plain size="small">
                {{ $t('Actions') }}
                <font-awesome-icon :icon="['fas', 'chevron-down']" class="icon-left" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit-role">
                    <font-awesome-icon :icon="['fas', 'user-edit']" class="icon-left" />
                    {{ $t('Edit Role') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="remove" divided>
                    <font-awesome-icon :icon="['fas', 'user-minus']" class="icon-left" />
                    {{ $t('Remove Member') }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </QuickTable> 
      </div>
    </el-card>

    <!-- Edit Role Dialog -->
    <el-dialog
      v-model="showEditRoleDialog"
      :title="$t('Edit Member Role')"
      width="400px"
    >
      <el-form :model="editingMember" label-width="80px">
        <el-form-item :label="$t('Roles')">
          <el-select
            v-model="editingMember.roles"
            multiple
            :placeholder="$t('Select roles')"
            style="width: 100%"
          >
            <el-option
              v-for="role in availableRoles"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditRoleDialog = false">{{ $t('Cancel') }}</el-button>
        <el-button type="primary" @click="saveMemberRole" :loading="savingRole">
          {{ $t('Save') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';
import { useWorkspaceMembers } from '../compositions/workspaces';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import { ElNotification, ElMessageBox } from 'element-plus';
import { useAuth } from '@/modules/core/compositions/authentication';
import workspacesMembersService from '@/services/apis/workspaces-members-service';
import workspacesService from '@/services/apis/workspaces-service';

const props = defineProps({
  workspaceId: {
    type: String,
    required: true
  },
  workspace: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['refresh-workspace']);

const { user } = useAuth();
const { load: loadMembers, members, loaded } = useWorkspaceMembers(props.workspaceId);

const invites = ref(props.workspace.invites || []);
const sendingInvites = ref(false);
const showEditRoleDialog = ref(false);
const editingMember = ref<any>({ roles: [] });
const savingRole = ref(false);

const isAdmin = computed(() => {
  return user.value?.roles?.includes('admin');
});

const canInviteMembers = computed(() => {
  return user.value?.roles?.includes('admin');
});

const membersColumns = computed(() => {
  const columns = [
    { label: 'First Name', prop: 'firstName' },
    { label: 'Last Name', prop: 'lastName' },
    { label: 'Email', prop: 'email' },
    { label: 'Roles', prop: 'roles' },
  ];
  
  if (isAdmin.value) {
    columns.push({ label: 'Actions', prop: 'actions' });
  }
  
  return columns;
});

const availableRoles = [
  { label: 'Member', value: 'member' },
  { label: 'Manager', value: 'manager' },
  { label: 'Admin', value: 'admin' }
];

function addInvite() {
  invites.value.push({
    name: '',
    email: '',
    roles: ['member']
  });
}

function removeInvite(index) {
  invites.value.splice(index, 1);
}

async function sendInvites() {
  // Filter out empty invites
  const validInvites = invites.value.filter(invite => invite.email && invite.email.trim() !== '');
  
  if (validInvites.length === 0) {
    ElNotification.warning('Please add at least one valid email address');
    return;
  }
  
  sendingInvites.value = true;
  try {
    // Add invites to the workspace
    await workspacesService.update(props.workspaceId, {
      ...props.workspace,
      invites: validInvites
    });
    ElNotification.success({
      title: 'Success',
      message: `${validInvites.length} invite${validInvites.length > 1 ? 's' : ''} sent successfully`,
      duration: 3000
    });
    // Emit event to refresh workspace data in parent
    emit('refresh-workspace');
  } catch (error) {
    console.error('Failed to send invites:', error);
    ElNotification.error({
      title: 'Error',
      message: 'Failed to send invites. Please try again.',
      duration: 5000
    });
  } finally {
    sendingInvites.value = false;
  }
}

function refreshMembers() {
  loadMembers();
}

function handleMemberAction(command: string, row: any) {
  switch (command) {
    case 'edit-role':
      editingMember.value = { ...row, roles: row.roles || [] };
      showEditRoleDialog.value = true;
      break;
    case 'remove':
      removeMember(row);
      break;
  }
}

async function removeMember(member: any) {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to remove ${member.firstName} ${member.lastName} from the workspace?`,
      'Remove Member',
      {
        confirmButtonText: 'Remove',
        cancelButtonText: 'Cancel',
        type: 'warning',
      }
    );
    
    await workspacesMembersService.delete(props.workspaceId, member.user);
    ElNotification.success({
      title: 'Success',
      message: `${member.firstName} ${member.lastName} removed from workspace`,
      duration: 3000
    });
    refreshMembers();
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Failed to remove member:', error);
      ElNotification.error({
        title: 'Error',
        message: 'Failed to remove member. Please try again.',
        duration: 5000
      });
    }
  }
}

async function saveMemberRole() {
  if (!editingMember.value.user) {
    ElNotification.error({
      title: 'Error',
      message: 'No member selected',
      duration: 3000
    });
    return;
  }
  
  savingRole.value = true;
  try {
    await workspacesMembersService.update(props.workspaceId, editingMember.value.user, {
      roles: editingMember.value.roles
    });
    ElNotification.success({
      title: 'Success',
      message: `Member role updated to ${editingMember.value.roles.join(', ')}`,
      duration: 3000
    });
    showEditRoleDialog.value = false;
    refreshMembers();
  } catch (error) {
    console.error('Failed to update member role:', error);
    ElNotification.error({
      title: 'Error',
      message: 'Failed to update member role. Please try again.',
      duration: 5000
    });
  } finally {
    savingRole.value = false;
  }
}

onMounted(() => {
  refreshMembers();
});
</script>

<style scoped>
.invite-card,
.members-card {
  margin-bottom: 30px;
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.card-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.subtitle {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.invites-list {
  margin-top: 15px;
}

.invites-table {
  margin-bottom: 15px;
}

.invites-actions {
  display: flex;
  justify-content: flex-start;
  gap: 10px;
  margin-top: 15px;
}

.members-list {
  margin-top: 15px;
}

.role-tag {
  margin-right: 5px;
}

.icon-left {
  margin-right: 5px;
}

.flex-end {
  margin-inline-start: auto;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
