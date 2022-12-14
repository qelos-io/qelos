<template>
  <div class="categories-page">
    <ListPageTitle title="Configurations" create-route="createConfiguration"/>
    <ConfigurationsList/>
  </div>
</template>
<script lang="ts" setup>
import ConfigurationsList from './components/ConfigurationsList.vue'
import ListPageTitle from '@/modules/core/components/semantics/ListPageTitle.vue';
</script>
