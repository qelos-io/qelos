<template>
  <div>
    <ListPageTitle 
      title="Blueprints" 
      description="Blueprints are data structures that define the schema and behavior of your application's entities. Create and manage your data models here."
      :create-route-query="{mode: 'create'}"
      create-text="New blueprint"
    >
      <template #content>
        <div class="view-toggle">
      <el-radio-group :model-value="currentView" @update:model-value="changeView" >
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
    <BlueprintsList :q="route.query.q"/>
    <BlueprintCreateDrawer :visible="$route.query.mode === 'create'" @close="$router.replace({query: {...$route.query, mode: undefined}})" />
  </div>
</template>
<script lang="ts" setup>
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import BlueprintCreateDrawer from '@/modules/no-code/components/BlueprintCreateDrawer.vue';
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
