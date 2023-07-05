<template>
  <div class="menus-page">
    <ListPageTitle title="Workspaces" create-route="createWorkspace"/>
    <InvitesList v-if="store.invites.length"/>
    <WorkspacesList/>
  </div>
</template>
<script lang="ts" setup>
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue'
import WorkspacesList from './components/WorkspacesList.vue';
import InvitesList from '@/modules/workspaces/components/InvitesList.vue';
import useInvitesList from '@/modules/workspaces/store/invites-list';

const store = useInvitesList()
</script>
