<template>
  <GpItem v-for="workspace in store.workspaces" :key="workspace._id">
    <template v-slot:title>
      {{ workspace.name }}
    </template>
    <template v-slot:actions>
      <small v-if="workspace.isPrivilegedUser" class="link" @click.prevent="store.remove(workspace)">
        <el-icon>
          <icon-delete/>
        </el-icon>
        {{ $t('Remove') }}
      </small>
      <small class="link" @click="store.activate(workspace)">
        {{ $t('Move to workspace') }}
      </small>
    </template>
  </GpItem>
</template>
<script lang="ts" setup>
import GpItem from '../../core/components/layout/BlockItem.vue';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';

const store = useWorkspacesList()
</script>
