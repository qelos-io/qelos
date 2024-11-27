<template>
  <div class="menus-page">
    <div class="header-container">
      <ListPageTitle title="Workspaces" :create-route="canUserCreateWorkspace ? 'adminCreateWorkspace' : undefined">
        <template v-slot:content>
          <div class="filter-container">
            <WorkspaceLabelFilter v-model="selectedLabels" :availableLabels="availableLabels" />
          </div>
        </template>
      </ListPageTitle>
    </div>
    <AdminWorkspacesList :selected-labels="selectedLabels" />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import AdminWorkspacesList from './components/AdminWorkspacesList.vue';
import WorkspaceLabelFilter from './components/WorkspaceLabelFilter.vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute()
const router = useRouter()

// State variables
const availableLabels = ref<string[]>(['*', 'supplier', 'store', 'consumer']);

const selectedLabels = computed({
  get: () => {
    // Get labels from query
    const labels = route.query.labels;
    return Array.isArray(labels) ? labels : labels ? [labels] : [];
  },
  set: (newLabels) => {
    // Update query route parameters
    router.push({
      query: { ...route.query, labels: newLabels.length ? newLabels : undefined },
    });
  },
});

const { canUserCreateWorkspace } = useWsConfiguration();
</script>

<style scoped>
.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-container {
  margin-left: 50px;
  height: 32px;
}
</style>