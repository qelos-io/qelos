<template>
  <el-form @submit.native.prevent="submit" class="workspace-form">
    <BlockItem>
      <div class="flex-row">
        <FormInput title="Workspace Name" v-model="data.name"/>
        <FormInput v-if="wsConfig.allowLogo" title="Workspace Logo" v-model="data.logo"/>
      </div>
    </BlockItem>

    <template v-if="!workspace._id && filteredLabels.length > 1">
      <h3>{{ $t(wsConfig.labelsSelectorTitle || 'Select your workspace type') }}</h3>
      <FormRowGroup>
        <el-form-item v-for="option of filteredLabels">
          <el-button @click.prevent="selectedLabels = option"
                     size="large"
                     :class="{ selected: selectedLabels === option, 'flex-1': true }"
                     :type="selectedLabels === option ? 'primary' : 'info'">{{ option.title }}
          </el-button>
        </el-form-item>
      </FormRowGroup>
    </template>

    <!-- <FormInput title="Workspace InviteList" :model-value="data.invites" @input="data.invites = $event" /> -->
    <h3>{{ $t('Invite Members') }}</h3>
    <p>{{ $t('If you want to invite members to this workspace, enter their email addresses below.') }}</p>
    <FormRowGroup align-start v-for="(invite, index) in data.invites" :key="index">
      <FormInput title="Name" v-model="invite.name" class="flex-1"/>
      <FormInput title="Email" type="email" v-model="invite.email" class="flex-1"/>
      <div class="flex-0 remove-row">
        <RemoveButton class="is-align-center" wide @click="removeItem(index)"/>
      </div>
    </FormRowGroup>
    <div>
      <AddMore @click="addItem"/>
    </div>

    <SaveButton class="save-btn" :submitting="submitting">Save</SaveButton>
  </el-form>

  <div class="container" v-if="workspace._id && members">
    <h3>{{ $t('Members') }}</h3>
    <QuickTable :data="members" :columns="membersColumns"/>
  </div>
</template>

<script lang="ts" setup>
import { computed, PropType, reactive, ref } from 'vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import FormInput from '../../core/components/forms/FormInput.vue';
import { clearNulls } from '../../core/utils/clear-nulls';
import AddMore from '../../core/components/forms/AddMore.vue';
import { IWorkspace } from '@qelos/sdk/dist/workspaces';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import { useWorkspaceMembers } from '@/modules/workspaces/compositions/workspaces';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { WorkspaceConfigurationMetadata, WorkspaceLabelDefinition } from '@qelos/global-types'
import { ElNotification } from 'element-plus';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { useAuth } from '@/modules/core/compositions/authentication';

const membersColumns = [
  { label: 'First Name', prop: 'firstName' },
  { label: 'Last Name', prop: 'lastName' },
  { label: 'Email', prop: 'email' },
  { label: 'Roles', prop: 'roles' },
]

const { workspace, wsConfig } = defineProps({
  submitting: Boolean,
  workspace: {
    type: Object as PropType<any>,
    default: () => ({})
  },
  wsConfig: Object as PropType<WorkspaceConfigurationMetadata>,
})
const emit = defineEmits(['submitted']);

const { user } = useAuth();

const filteredLabels = computed(() => wsConfig.labels?.filter(l => !l.allowedRolesForCreation ||
    l.allowedRolesForCreation.includes('*') ||
    l.allowedRolesForCreation.some(r => user.value.roles.includes(r))
) || []);

const { load: loadMembers, members } = useWorkspaceMembers(workspace._id);
const selectedLabels = ref<WorkspaceLabelDefinition>()

if (workspace._id) {
  loadMembers();
} else {
  selectedLabels.value = filteredLabels.value[0];
}

const data = reactive<Partial<IWorkspace>>({
  name: workspace.name || null,
  logo: workspace.logo || null,
  invites: workspace.invites || [{
    name: null,
    email: null,
  }],
  labels: workspace.labels || [],
});

function submit() {
  if (!workspace._id) {
    let labels = selectedLabels.value?.value || [];
    if (filteredLabels.value.length === 1) {
      labels = filteredLabels.value[0].value;
    }
    if (labels.length) {
      data.labels = labels;
    }
    if (data.labels.length === 0 && !wsConfig.allowNonLabeledWorkspaces) {
      ElNotification.error('Please select a workspace type');
      return;
    }
  }
  emit('submitted', clearNulls(data))
}

function addItem() {
  data.invites.push({
    name: null,
    email: null,
  })
}

function removeItem(index) {
  data.invites.splice(index, 1)
}

</script>
<style scoped>
.workspace-form {
  margin: 10px;
}

h3 {
  margin-block: 15px;
}

.flex-row > * {
  margin: 10px;
  flex: 1;
}

.save-btn {
  margin-left: 8px;
}
</style>
