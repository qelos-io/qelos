<template>
  <div>
    <ListPageTitle title="Blueprints" :create-route-query="{mode: 'create'}">
      <template #content>
        <div class="view-toggle">
      <el-radio-group :model-value="currentView" @update:model-value="changeView" size="large">
        <el-radio-button value="list">
          <el-icon><icon-list /></el-icon>
          {{ $t('List View') }}
        </el-radio-button>
        <el-radio-button value="graph">
          <el-icon><icon-connection /></el-icon>
          {{ $t('Relations Graph') }}
        </el-radio-button>
      </el-radio-group>
    </div>
      </template>
    </ListPageTitle>
    <BlueprintsList/>
    <BlueprintCreateModal :visible="$route.query.mode === 'create'" @close="$router.push({query: {mode: undefined}})" />
  </div>
</template>
<script lang="ts" setup>
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import BlueprintCreateModal from '@/modules/no-code/components/BlueprintCreateModal.vue';
import { useRoute, useRouter } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const router = useRouter();

const currentView = computed(() => {
  return (route.query.view as 'list' | 'graph') || 'list';
});


// Change view by updating route query
function changeView(view: 'list' | 'graph') {
  router.push({
    query: { ...route.query, view }
  });
}
</script>
