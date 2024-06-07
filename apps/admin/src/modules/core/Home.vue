<template>
  <h3>{{ $t('Welcome!') }}</h3>
  <PrivilegedHome v-if="isPrivilegedUser"/>
  <NonPrivilegedHome v-if="loaded && authStore.isLoaded && !isPrivilegedUser"/>
</template>
<script setup lang="ts">
import { isPrivilegedUser, authStore } from '@/modules/core/store/auth';
import PrivilegedHome from '@/modules/core/PrivilegedHome.vue';
import NonPrivilegedHome from '@/modules/core/NonPrivilegedHome.vue';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';

const { loaded } = useAppConfiguration();
</script>
<style scoped>
h3 {
  padding: 10px;
  font-weight: normal;
}
</style>
