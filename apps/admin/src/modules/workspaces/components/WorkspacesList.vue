<template>
  <BlockItem v-for="workspace in store.workspaces" :key="workspace._id">
    <template v-slot:title>
      <router-link :to="{name: 'editWorkspace', params: {id: workspace._id}}">
        {{ workspace.name }}
      </router-link>
    </template>
    <template v-slot:actions>
      <el-button text type="danger" v-if="workspace.isPrivilegedUser" @click.prevent="store.remove(workspace._id)">
        <el-icon>
          <icon-delete/>
        </el-icon>
        <span>{{ $t('Remove') }}</span>
      </el-button>
      <el-button text @click="store.activate(workspace)">
        {{ $t('Move to workspace') }}
      </el-button>
    </template>
  </BlockItem>
</template>
<script lang="ts" setup>
import BlockItem from '../../core/components/layout/BlockItem.vue';
import useWorkspacesList from '@/modules/workspaces/store/workspaces-list';

const store = useWorkspacesList()
</script>
