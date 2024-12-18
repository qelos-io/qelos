<script setup lang="ts">

import StatsCard from '@/modules/pre-designed/components/StatsCard.vue';
</script>

<template>
<StatsCard :value="10476"
           :title="$t('Enter any title')"
           :label="$t('A place to enter a description label')"
           color="yellow"
           action-route="/"
           action-text="Action Text"
           :fa-icon="['fas', 'briefcase']"/>
</template>

<style scoped>

</style>