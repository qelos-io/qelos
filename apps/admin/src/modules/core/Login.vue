<template>
  <div class="login-page">
    <img alt="SaaS" :src="config?.metadata.logoUrl || '../../assets/logo.png'">
    <h1>{{ $t('Please login') }}:</h1>
    <LoginForm/>
  </div>
</template>

<script setup lang="ts">
import LoginForm from './components/LoginForm.vue'
import {useAppConfiguration} from '@/modules/configurations/store/app-configuration';

const config = useAppConfiguration()
</script>
<style scoped>
.login-page {
  text-align: center;
  background: linear-gradient(318deg, var(--body-bg) 0%, var(--border-color) 100%);
  height: 100%;
}

img {
  max-width: 400px;
  width: 80%;
  padding: 30px;
}
</style>
