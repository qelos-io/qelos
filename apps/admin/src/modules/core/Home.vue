<template>
  <template v-if="loaded">
    <PrivilegedHome v-if="isPrivilegedUser && (!appConfig.homeScreen || appConfig.homeScreen === '/')"/>
    <NonPrivilegedHome v-else/>
  </template>
</template>
<script setup lang="ts">
import { isPrivilegedUser } from '@/modules/core/store/auth';
import PrivilegedHome from '@/modules/core/PrivilegedHome.vue';
import NonPrivilegedHome from '@/modules/core/NonPrivilegedHome.vue';
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';

const { loaded, appConfig } = useAppConfiguration();
</script>
