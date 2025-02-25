<script lang="ts" setup>
import { computed } from 'vue';
import useAdminWorkspacesList from '../store/admin-workspaces-list';
import { useRoute } from 'vue-router';

const store = useAdminWorkspacesList();
const route = useRoute();

const props = defineProps<{
  selectedLabels: string[];
}>();

if (!store.loading) {
  store.reload();
}

const filteredWorkspaces = computed(() => {
  const reg = new RegExp(route.query.q?.toString(), 'i');

  return store.workspaces.filter(workspace => {
    const matchesQuery = reg.test(workspace.name);
    const matchesLabels =
      props.selectedLabels.length === 0 || props.selectedLabels.every(label => workspace.labels.includes(label));

    return matchesQuery && matchesLabels;
  });
});
</script>

<template>
  <div>
    <BlockItem v-for="workspace in filteredWorkspaces" :key="workspace._id">
      <template v-slot:title>
        <router-link :to="{ name: 'adminEditWorkspace', params: { id: workspace._id } }">
          {{ workspace.name }}
        </router-link>
      </template>
      <template v-slot:default>
        <div v-if="workspace.labels && workspace.labels.length" class="labels-container">
          <span v-for="label in workspace.labels" :key="label" class="label-item">{{ label }}</span>
        </div>
      </template>
      <template v-slot:actions>
        <el-button text type="danger" @click.prevent="store.remove(workspace._id)">
          <el-icon>
            <icon-delete />
          </el-icon>
          <span>{{ $t('Remove') }}</span>
        </el-button>
      </template>
    </BlockItem>
  </div>
</template>

<style scoped>
.labels-container {
  margin-top: 8px;
}

.label-item {
  display: inline-block;
  margin-right: 5px;
  padding: 4px 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  font-size: 0.9em;
}
</style>