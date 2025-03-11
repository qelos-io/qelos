<template>
	<div class="filter-container">
		<!-- Dropdown for selecting roles -->
		<el-select v-model="selectedRoles" multiple clearable collapse-tags filterable placeholder="Select roles"
			popper-class="roles-dropdown-header" :max-collapse-tags="10" @change="updateQuery" style="width: 320px">
			<!-- Custom header with "Select all" checkbox -->
			<template #header>
				<el-checkbox v-model="checkAllRoles" :indeterminate="indeterminateRoles" @change="handleCheckAllRoles">
					All roles
				</el-checkbox>
			</template>

			<!-- Role options -->
			<el-option v-for="role in allRoles" :key="role" :label="role" :value="role" />
		</el-select>
	</div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CheckboxValueType } from 'element-plus'
import { IUser } from '@/modules/core/store/types/user';

// Router and route
const route = useRoute()
const router = useRouter()

// Variables for multiselect and checkbox
const selectedRoles = ref<CheckboxValueType[]>([])
const checkAllRoles = ref(false)
const indeterminateRoles = ref(false)

const props = defineProps<{users: IUser[]}>()

// Compute all unique roles from the users list
const allRoles = ref<string[]>([])

// Watch for route changes to update the selected value
watch(
	() => props.users,
	(newUsers) => {
		if (newUsers && newUsers.length > 0) {
			const roles = newUsers.flatMap(user => user.roles)
			allRoles.value = Array.from(new Set(roles))
		} else {
			allRoles.value = []
		}
	},
	{ immediate: true }
)

// Watch for route changes to update the selected value
watch(
	() => route.query.roles,
	(newQuery) => {
		selectedRoles.value = (newQuery ? (newQuery as string).split(',') : []) || []
		updateCheckboxState()
	},
	{ immediate: true }
)

// Function to update the state of the "Select All" checkbox for roles

function updateCheckboxState() {
	if (selectedRoles.value.length === 0) {
		checkAllRoles.value = false
		indeterminateRoles.value = false
	} else if (selectedRoles.value.length === allRoles.value.length) {
		checkAllRoles.value = true
		indeterminateRoles.value = false
	} else {
		indeterminateRoles.value = true
	}
}

// Update the route parameter based on the selected roles

function updateQuery() {
	router.push({
		name: 'users',
		query: { ...route.query, roles: selectedRoles.value.join(',') || undefined },
	})
}


// Handle selection/deselection of all roles
const handleCheckAllRoles = (val: CheckboxValueType) => {
	indeterminateRoles.value = false
	if (val) {
		selectedRoles.value = allRoles.value
	} else {
		selectedRoles.value = []
	}
	updateQuery()
}
</script>

<style scoped lang="scss">
.roles-dropdown-header {
	.el-checkbox {
		display: flex;
		height: unset;
	}
}
</style>