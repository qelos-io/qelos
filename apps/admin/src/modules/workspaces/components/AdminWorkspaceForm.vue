<template>
	<el-form @submit.native.prevent="submit" class="workspace-form">
		<div class="labels-section">
			<p>{{ $t('Workspace Labels') }}</p>

			<el-form-item>
				<el-select v-model="data.labels" multiple :filterable="true" clearable placeholder="Manage labels"
					class="styled-select" popper-class="workspaces-dropdown-header" style="width: 100%;"
					:allow-create="true" @change="handleLabelChange">
					<el-option v-for="label in loadedLabels" :key="label" :label="label" :value="label" />
				</el-select>
			</el-form-item>
		</div>
		<SaveButton class="save-btn" :submitting="submitting">{{ $t('Save') }}</SaveButton>
	</el-form>

	<div class="container">
		<div class="member-header">
			<h3>{{ $t('Members') }}</h3>
			<el-input v-model="searchQueryForMembers" placeholder="Type to search by name or email" clearable
				class="search-input" />
		</div>

		<QuickTable :data="filteredMembers" :columns="membersColumns" highlight-current-row
			@current-change="updateMemberRoles">
			<template #firstName="{ row }">
				{{ decodeURIComponent(row.firstName) }}
			</template>
			<template #lastName="{ row }">
				{{ decodeURIComponent(row.lastName) }}
			</template>
			<template #email="{ row }">
				<router-link :to="{ name: 'editUser', params: { userId: row.user || 0 }}">
					{{ row.email }}
				</router-link>
			</template>
			<template #roles="{ row, $index }">
				<el-select v-model="members[$index].roles" multiple clearable filterable
					placeholder="Add or select roles" :allow-create="true" style="width: 100%;">
					<el-option v-for="role in rolesList" :key="role.value" :label="role.label" :value="role.value" />
				</el-select>
			</template>
			<template #operations="{ row, $index }">
				<SaveButton class="save-btn" :submitting="submitting" @click="updateMemberRoles($index)">
					{{ $t('Save') }}
				</SaveButton>
				<RemoveButton @click="removeMember(row.user)" />
			</template>
		</QuickTable>

		<div class="add-member-section">
			<h4>{{ $t('Add New Member') }}</h4>
			<div class="flex-row">
				<el-select v-model="selectedUserId" filterable remote reserve-keyword placeholder="Search for users"
					:remote-method="searchUsers" :loading="loadingUsers" style="width: 100%;" @change="onUserSelected">
					<el-option v-for="user in filteredUsers" :key="user.value" :label="user.label"
						:value="user.value" />
				</el-select>

				<el-select v-model="roles" :allow-create="true" :filterable="true" placeholder="Enter or select a role"
					clearable style="width: 100%;" multiple>
					<el-option v-for="role in rolesList" :key="role.value" :label="role.label" :value="role.value" />
				</el-select>
				<button type="button" @click="addMember()" class="add-button">
					{{ $t('Add Member') }}
				</button>
			</div>
		</div>
	</div>

</template>

<script lang="ts" setup>

import { onMounted, PropType, reactive, ref, watch, defineEmits, computed } from 'vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import FormInput from '../../core/components/forms/FormInput.vue';
import { clearNulls } from '../../core/utils/clear-nulls';
import AddMore from '../../core/components/forms/AddMore.vue';
import { IWorkspace } from '@qelos/sdk/dist/workspaces';
import QuickTable from '@/modules/pre-designed/components/QuickTable.vue';
import {
	useAddWorkspaceMember,
	useDeleteWorkspaceMember,
	useUpdateWorkspaceMember, useWorkspaceMembers
} from '@/modules/workspaces/compositions/workspaces';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { ElMessage } from 'element-plus';
import { WorkspaceLabelDefinition } from '@qelos/global-types'
import { useUsersList } from '@/modules/users/compositions/users';
import { IUser } from '@/modules/core/store/types/user';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
const { users, loading } = useUsersList();

const searchQueryForMembers = ref('');
const searchQueryForUsers = ref('');
const loadingUsers = computed(() => loading.value);
const selectedUserId = ref<string | null>(null);

const filteredUsers = computed(() => {
	const query = searchQueryForUsers.value.trim().toLowerCase();
	const currentMemberIds = new Set(members.value.map(member => member.user))
	if (!query) {
		return []

	}

	return users.value
		.filter((user) => {
			const displayName = getUserDisplayName(user).toLowerCase();
			const email = user.email?.toLowerCase() || '';
			return (!currentMemberIds.has(user._id) && displayName.includes(query) || email.includes(query));
		})
		.map((user) => ({
			value: user._id,
			label: `${getUserDisplayName(user)}${user.email ? ` (${user.email})` : ''}`,
		}));
});

// Function to process input in the search bar
function searchUsers(query: string) {
	searchQueryForUsers.value = query;
}

// Generate the user's display name
function getUserDisplayName(user: IUser): string {
	if (user.fullName) {
		return user.fullName;
	}

	const firstName = user.firstName ?? '';
	const lastName = user.lastName ?? '';
	if (firstName || lastName) {
		return `${decodeURIComponent(firstName)} ${decodeURIComponent(lastName)}`.trim();
	}

	return user.username ?? 'Unknown';
}

function onUserSelected(value: string | null) {
	selectedUserId.value = value
}

const membersColumns = [

	{ label: 'First Name', prop: 'firstName' },
	{ label: 'Last Name', prop: 'lastName' },
	{ label: 'Email', prop: 'email' },
	{ label: 'Roles', prop: 'roles' },
	{ label: 'Operations', prop: 'operations', render: () => null },
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

const rolesList = [
	{ label: 'Admin', value: 'admin' },
	{ label: 'Member', value: 'member' },
	{ label: 'User', value: 'user' },
];

const loadedLabels = ref<string[]>([]);

const roles = ref(null);

const wsConfig = useWsConfiguration();
const selectedLabels = ref<WorkspaceLabelDefinition>()

if (workspace._id) {
	loadMembers();
	members.value = members.value || [];   // Initialize the list of members if it is empty
	loadedLabels.value = workspace.labels || []; 
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
onMounted(() => {
	loadLabelsFromWorkspace();
})
watch(
	() => workspace.labels,
	(newLabels) => {
		loadedLabels.value = newLabels || [];
	},
	{ immediate: true }
);

// Handle changes to labels
function handleLabelChange(updatedLabels: string[]) {
	data.labels = updatedLabels;
}

// Load labels from the workspace
function loadLabelsFromWorkspace() {
	loadedLabels.value = workspace.labels || [];
}

function submit() {
	if (!workspace._id) {
		data.labels = selectedLabels.value.value || [];
	}
	emit('submitted', clearNulls(data))
}

const filteredMembers = computed(() => {
	const searchTerm = searchQueryForMembers.value.toLowerCase();
	return (members.value || []).filter((member) => {
		return (
			!searchTerm ||
			member.email.toLowerCase().includes(searchTerm) ||
			getUserDisplayName(member).toLowerCase().includes(searchTerm)
		);
	});
});

const { addNewMember } = useAddWorkspaceMember(workspace._id);

function addMember() {
	if (!selectedUserId.value || !Array.isArray(roles.value) || roles.value.length === 0) {
		ElMessage({
			message: 'Please select a user and assign at least one role.',
			type: 'warning',
		});
		return;
	}

	const newMember = {

		userId: selectedUserId.value,
		roles: roles.value,
	};

	// Use the `add` method from useWorkspaceMembers to add the new member
	addNewMember(newMember)
		.then(() => {
			members.value.push(newMember);
			// Clear form fields after successful addition
			selectedUserId.value = '';
			roles.value = null;
		})
		.catch((error) => {
			// Remove the newly added member from the list if there was an error
			members.value = members.value.filter(
				(member) => member.userId !== newMember.userId
			);

		});
}

const { deleteMember } = useDeleteWorkspaceMember(workspace._id);

function removeMember(userId: string) {

	deleteMember(userId)
		.then(() => {
			members.value = members.value.filter((member) => member.user !== userId);
		})
}

const { updateMember } = useUpdateWorkspaceMember(workspace._id);


function updateMemberRoles(index: number) {
	const member = members.value[index];

	const updatedMember = {
		userId: member.user,
		roles: member.roles,
	};

	// Locally update the interface to reflect the changes
	members.value[index] = { ...member, roles: updatedMember.roles };

	// Call the update function
	updateMember(updatedMember)
}

</script>

<style scoped>
.workspace-form {
	margin: 10px;
}

.flex-row>* {
	margin: 10px;
	flex: 1;
}

.remove-button {
	margin-left: 8px;
	margin-top: 45px;
}

.save-btn {
	margin-left: 8px;
}

.styled-select {
	width: 100%;
	margin-top: 10px;
}

.add-button {
	padding: 5px 10px;
	cursor: pointer;
}

.member-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 10px;

}

.member-header h3 {
	margin-right: 20px;
}

.search-input {
	width: 100%;
	margin-bottom: 10px;
}
</style>
