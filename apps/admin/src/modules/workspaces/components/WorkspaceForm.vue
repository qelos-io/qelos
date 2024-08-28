<template>
  <el-form @submit.native.prevent="submit" class="workspace-form">
    <div class="flex-row">
      <FormInput title="Workspace Name" v-model="data.name"/>
      <FormInput title="Workspace Logo" v-model="data.logo"/>
    </div>
    <!-- <FormInput title="Workspace InviteList" :model-value="data.invites" @input="data.invites = $event" /> -->
    <span>{{$t('Workspace Invite List')}}</span>
    <div class="flex-row" v-for="(invite, index) in data.invites" :key="index">
      <FormInput title="Name" v-model="invite.name"/>
      <FormInput title="Email" v-model="invite.email"/>
      <button type="button" class="remove-button" @click="removeItem(index)">remove</button>
    </div>
    <div>
      <AddMore @click="addItem"/>
    </div>

    <SaveButton class="save-btn" :submitting="submitting">Save</SaveButton>
  </el-form>

  <div class="container" v-if="workspace._id && members">
    <h3>{{$t('Members')}}</h3>
    <QuickTable :data="members" :columns="membersColumns"/>
  </div>
</template>

<script lang="ts" setup>
import { PropType, reactive } from 'vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import FormInput from '../../core/components/forms/FormInput.vue';
import { clearNulls } from '../../core/utils/clear-nulls';
import AddMore from '../../core/components/forms/AddMore.vue';
import { IWorkspace } from '@qelos/sdk/dist/workspaces';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import { useWorkspaceMembers } from '@/modules/workspaces/compositions/workspaces';

const membersColumns = [
  { label: 'First Name', prop: 'firstName' },
  { label: 'Last Name', prop: 'lastName' },
  { label: 'Email', prop: 'email' },
  { label: 'Roles', prop: 'roles' },
]

const { workspace } = defineProps({
  submitting: Boolean,
  workspace: {
    type: Object as PropType<any>,
    default: () => ({})
  }
})
const emit = defineEmits(['submitted']);

const { load: loadMembers, members } = useWorkspaceMembers(workspace._id);

if (workspace._id) {
  loadMembers();
}

const data = reactive<Partial<IWorkspace>>({
  name: workspace.name || null,
  logo: workspace.logo || null,
  invites: workspace.invites || [{
    name: null,
    email: null,
  }],
});

function submit() {
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

.flex-row > * {
  margin: 10px;
  flex: 1;
}

.remove-button {
  margin-left: 8px;
  margin-top: 45px;
  color: red;
  width: 20px;
  height: 45px;
  background-color: transparent;
  flex-grow: 0.5;
  box-shadow: none;
}

.save-btn {
  margin-left: 8px;
}
</style>
