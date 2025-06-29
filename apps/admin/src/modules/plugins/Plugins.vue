<template>
  <div class="plugins-page">
    <ListPageTitle 
      title="Your Plugins" 
      description="Plugins extend your application with custom functionality, integrations, and micro-frontends. Create and manage your plugins here."
      :create-route-query="{mode: 'quick-create'}" 
    />
    <YourPluginsList/>
    <QuickPluginFormModal :visible="$route.query.mode === 'quick-create'" @close="$router.push({query: {mode: undefined}})" @saved="afterSave" />
  </div>
</template>
<script lang="ts" setup>
import ListPageTitle from '../core/components/semantics/ListPageTitle.vue'
import QuickPluginFormModal from './components/QuickPluginFormModal.vue';
import YourPluginsList from './components/YourPluginsList.vue';
import { usePluginsList } from './store/plugins-list';

const store = usePluginsList()

function afterSave() {
  store.retry();
}
</script>
