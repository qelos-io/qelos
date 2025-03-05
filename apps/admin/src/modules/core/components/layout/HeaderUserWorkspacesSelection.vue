<template>
  <el-dropdown-item v-if="user.workspace">
    <router-link :to="{ name: 'editMyWorkspace', params: {id: user.workspace._id} }">
      <span class="workspace-row">{{ wsName }}</span>
    </router-link>
  </el-dropdown-item>
  <el-dropdown-item>
    <router-link :to="{name: 'workspaces'}">{{ $t('Workspaces') }}</router-link>
  </el-dropdown-item>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { useAuth } from '@/modules/core/compositions/authentication';

const { user } = useAuth()

const wsName = computed(() => decodeURIComponent(user.value.workspace.name || ''))
</script>
<style scoped>
.workspace-row {
  color: var(--inputs-text-color);
}
</style>
