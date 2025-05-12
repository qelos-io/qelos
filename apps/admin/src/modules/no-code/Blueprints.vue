<template>
  <div>
    <ListPageTitle title="Blueprints" :create-route-query="{mode: 'create'}"/>
    <BlueprintsList/>
    <BlueprintCreateModal :visible="$route.query.mode === 'create'" @close="$router.push({query: {mode: undefined}})" />
  </div>
</template>
<script lang="ts" setup>
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import BlueprintCreateModal from '@/modules/no-code/components/BlueprintCreateModal.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
</script>
