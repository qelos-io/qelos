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
import { useAuth } from '@/modules/core/compositions/authentication';

const { user } = useAuth()
</script>
<style scoped>
.workspace-row {
  color: var(--inputs-text-color);
}
</style>
