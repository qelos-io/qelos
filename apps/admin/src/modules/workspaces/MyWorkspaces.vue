<template>
  <div class="menus-page">
    <Breadcrumb :items="breadcrumbItems" />
    
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
import { toRefs, computed } from 'vue';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue'
import WorkspacesList from './components/WorkspacesList.vue';
import InvitesList from '@/modules/workspaces/components/InvitesList.vue';
import useInvitesList from '@/modules/workspaces/store/invites-list';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import Breadcrumb from '@/modules/core/components/Breadcrumb.vue';
import { useI18n } from 'vue-i18n';

interface BreadcrumbItem {
  text: string
  icon?: any
  to?: string | object
}

const store = useInvitesList()
const { t } = useI18n()

const { canUserCreateWorkspace } = toRefs(useWsConfiguration())

const breadcrumbItems = computed((): BreadcrumbItem[] => [
  { text: t('Home'), icon: ['fas', 'home'], to: '/' },
  { text: t('My Workspaces') }
])

</script>

<style scoped>
.menus-page {
  padding: 20px;
}
</style>
