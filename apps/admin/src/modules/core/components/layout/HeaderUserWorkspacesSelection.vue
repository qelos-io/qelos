<template>
  <el-dropdown-item v-if="user.workspace">
    <router-link :to="{ name: 'editMyWorkspace', params: {id: user.workspace._id} }">
      <span class="workspace-row">{{ user.workspace.name }}</span>
    </router-link>
  </el-dropdown-item>
  <el-dropdown-item>
    <router-link :to="{name: 'workspaces'}">{{ $t('Workspaces') }}</router-link>
  </el-dropdown-item>
</template>
<script lang="ts" setup>
import { watch } from 'vue';
import { useAuth } from '@/modules/core/compositions/authentication';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';

const { user } = useAuth()
const workspacesStore = useWorkspacesList();

if (!user.value.workspace) {
  watch(() => workspacesStore.workspaces, () => {
    if (workspacesStore.workspaces.length) {
      workspacesStore.activateSilently(workspacesStore.workspaces[0])
    }
  }, { once: true })
}
</script>
<style scoped>
.workspace-row {
  color: var(--inputs-text-color);
}
</style>
