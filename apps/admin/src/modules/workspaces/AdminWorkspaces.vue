<template>
	<div class="menus-page">
		<ListPageTitle title="Workspaces" :create-route="canUserCreateWorkspace ? 'adminCreateWorkspace' : undefined" />
		<InvitesList v-if="store.invites.length" />
		<AdminWorkspacesList />

	</div>
</template>
<script lang="ts" setup>
import { toRefs } from 'vue';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue'

import InvitesList from '@/modules/workspaces/components/InvitesList.vue';
import useInvitesList from '@/modules/workspaces/store/invites-list';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import AdminWorkspacesList from './components/AdminWorkspacesList.vue';


const store = useInvitesList()

const { canUserCreateWorkspace } = toRefs(useWsConfiguration())

</script>