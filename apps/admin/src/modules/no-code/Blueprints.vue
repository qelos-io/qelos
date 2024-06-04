<template>
  <div>
    <ListPageTitle title="Blueprints" create-route="createBlueprint"/>
    <BlueprintsList/>
  </div>
</template>
<script lang="ts" setup>
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
</script>
