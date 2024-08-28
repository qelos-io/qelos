<script setup lang="ts">
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import { useRouter } from 'vue-router';

const router = useRouter()
const { appConfig } = useAppConfiguration();

if (appConfig.value.homeScreen) {
  router.push(appConfig.value.homeScreen);
}
</script>
<template>
  <h3>{{ $t('Welcome!') }}</h3>
</template>
<style scoped>
h3 {
  padding: 10px;
  font-weight: normal;
}
</style>