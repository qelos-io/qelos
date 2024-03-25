<template>
  <h3>{{ $t('Welcome!') }}</h3>
  <PrivilegedHome v-if="isPrivilegedUser"/>
</template>
<script setup lang="ts">
import {useI18n} from 'vue-i18n';
import {isPrivilegedUser} from '@/modules/core/store/auth';
import PrivilegedHome from '@/modules/core/PrivilegedHome.vue';

const {t} = useI18n();
</script>
<style scoped>
h3 {
  padding: 10px;
  font-weight: normal;
}
</style>
