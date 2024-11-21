<template>
	<div>
		<BlockItem v-for="workspace in filteredWorkspaces" :key="workspace._id">
			<template v-slot:title>
				<router-link :to="{ name: 'editMyWorkspace', params: { id: workspace._id } }">
					{{ workspace.name }}
				</router-link>
			</template>
			<template v-slot:actions>
				<el-button text type="danger" @click.prevent="store.remove(workspace._id)">
					<el-icon>
						<icon-delete />
					</el-icon>
					<span>Remove</span>
				</el-button>
			</template>
		</BlockItem>
	</div>
</template>

<script lang="ts" setup>

import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import useAdminWorkspacesList from '../store/admin-workspaces-list';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const store = useAdminWorkspacesList();

const route = useRoute()

const filteredWorkspaces = computed(() => {
	const reg = new RegExp(route.query.q?.toString(), 'i');

	return store.workspaces.filter(workspace => {
		return reg.test(workspace.name)
	})
})

</script>