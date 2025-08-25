<template>
  <template v-if="loaded">
    <PrivilegedHomeComponent v-if="isPrivilegedUser && (!appConfig.homeScreen || appConfig.homeScreen === '/')"/>
    <NonPrivilegedHome v-else/>
  </template>
</template>
<script setup lang="ts">
import { isPrivilegedUser } from '@/modules/core/store/auth';
import NonPrivilegedHome from '@/modules/core/NonPrivilegedHome.vue';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import { defineAsyncComponent } from 'vue';

const { loaded, appConfig } = useAppConfiguration();

const PrivilegedHomeComponent = defineAsyncComponent(() => import('./PrivilegedHome.vue'));
</script>
