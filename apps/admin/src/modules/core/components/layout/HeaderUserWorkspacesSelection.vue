<template>
  <el-dropdown-item v-if="user.workspace" @click.stop class="workspace-row">
    <router-link :to="{ name: 'editMyWorkspace', params: {id: user.workspace._id} }">
      <span class="link">{{ wsName }}</span>
    </router-link>
  </el-dropdown-item>
  <el-dropdown-item @click.stop>
    <router-link :to="{name: 'workspaces'}">{{ $t('Workspaces') }}</router-link>
  </el-dropdown-item>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { useAuth } from '@/modules/core/compositions/authentication';

const { user } = useAuth()

const wsName = computed(() => decodeURIComponent(decodeURIComponent(user.value.workspace.name || '')))
</script>
<style scoped>
.workspace-row .link {
  color: var(--inputs-text-color);
}
.workspace-row:hover .link {
  color: var(--link);
}
</style>
