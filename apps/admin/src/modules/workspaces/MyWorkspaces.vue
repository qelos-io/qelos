<template>
  <div class="menus-page">
    <!-- Breadcrumb Navigation -->
    <el-breadcrumb class="workspace-breadcrumb" separator="/">
      <el-breadcrumb-item to="/">
        <font-awesome-icon :icon="['fas', 'home']" class="breadcrumb-icon" />
        {{ $t('Home') }}
      </el-breadcrumb-item>
      <el-breadcrumb-item>
        {{ $t('My Workspaces') }}
      </el-breadcrumb-item>
    </el-breadcrumb>
    
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

<style scoped>
.menus-page {
  padding: 20px;
}

.workspace-breadcrumb {
  margin-bottom: 20px;
  padding: 10px 0;
}

.breadcrumb-icon {
  margin-right: 5px;
  color: var(--el-color-primary);
}
</style>
