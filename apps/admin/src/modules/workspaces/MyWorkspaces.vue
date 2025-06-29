<template>
  <div class="menus-page">
    <ListPageTitle 
      title="My Workspaces" 
      description="Your personal workspaces and those you've been invited to join. Switch between workspaces to access different projects and data."
      :create-route="canUserCreateWorkspace ? 'createMyWorkspace' : undefined"
    />
    <InvitesList v-if="store.invites.length"/>
    <WorkspacesList/>
  </div>
</template>
<script lang="ts" setup>
import { toRefs } from 'vue';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue'
import WorkspacesList from './components/WorkspacesList.vue';
import InvitesList from '@/modules/workspaces/components/InvitesList.vue';
import useInvitesList from '@/modules/workspaces/store/invites-list';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

const store = useInvitesList()

const { canUserCreateWorkspace } = toRefs(useWsConfiguration())

</script>
