<template>
  <div class="plugins-page">
    <ListPageTitle 
      title="Your Plugins" 
      description="Plugins extend your application with custom functionality, integrations, and micro-frontends. Create and manage your plugins here."
      :create-route-query="{mode: 'quick-create'}" 
    />
    <YourPluginsList/>
    <NewPluginDialog :visible="$route.query.mode === 'quick-create'" @close="closeDialog" />
  </div>
</template>
<script lang="ts" setup>
import ListPageTitle from '../core/components/semantics/ListPageTitle.vue'
import NewPluginDialog from './components/new-plugin/NewPluginDialog.vue';
import YourPluginsList from './components/YourPluginsList.vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

function closeDialog() {
  if (route.query.mode === 'quick-create') router.push({ query: { ...route.query, mode: undefined, option: undefined } });
}
</script>
