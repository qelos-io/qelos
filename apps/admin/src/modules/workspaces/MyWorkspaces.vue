<template>
  <div class="menus-page">
    <Breadcrumb :items="breadcrumbItems" />
    
    <InvitesList v-if="store.invites.length"/>
    <WorkspacesList/>
  </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import WorkspacesList from './components/WorkspacesList.vue';
import InvitesList from '@/modules/workspaces/components/InvitesList.vue';
import useInvitesList from '@/modules/workspaces/store/invites-list';
import Breadcrumb from '@/modules/core/components/Breadcrumb.vue';
import { useI18n } from 'vue-i18n';

interface BreadcrumbItem {
  text: string
  icon?: any
  to?: string | object
}

const store = useInvitesList()
const { t } = useI18n()

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
