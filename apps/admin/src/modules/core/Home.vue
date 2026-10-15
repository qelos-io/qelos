<template>
  <!-- one root, so the layout's class lands on an element instead of being dropped on a fragment -->
  <div v-if="loaded" class="home">
    <PrivilegedHomeComponent v-if="isPrivilegedUser && (!appConfig.homeScreen || appConfig.homeScreen === '/')"/>
    <NonPrivilegedHome v-else/>
  </div>
</template>

<style scoped>
.home {
  inline-size: 100%;
  min-block-size: 100%;
}
</style>
<script setup lang="ts">
import { isPrivilegedUser } from '@/modules/core/store/auth';
import NonPrivilegedHome from '@/modules/core/NonPrivilegedHome.vue';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import { defineAsyncComponent } from 'vue';

const { loaded, appConfig } = useAppConfiguration();

const PrivilegedHomeComponent = defineAsyncComponent(() => import('./PrivilegedHome.vue'));
</script>
