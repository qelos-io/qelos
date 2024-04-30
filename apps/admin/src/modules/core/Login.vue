<template>
  <div class="login-page">
    <aside>
      <img :alt="appConfig?.name || 'SaaS'" :src="appConfig?.logoUrl || '../../assets/logo.png'">
      <h1>{{ $t('Please login') }}:</h1>
    </aside>
    <div>
      <LoginForm/>
    </div>
  </div>
</template>

<script setup lang="ts">
import LoginForm from './components/LoginForm.vue'
import {useAppConfiguration} from '@/modules/configurations/store/app-configuration';

const {appConfig} = useAppConfiguration();
</script>
<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  margin: 0;
  height: 100%;
  gap: 10px;
  border: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .login-page {
    width: 100%;
    flex-direction: column;
  }
  .login-page > * {
    width: 100%;
  }
}

.login-page > * {
  flex: 1;
}

aside {
  background: linear-gradient(318deg, var(--body-bg) 0%, var(--border-color) 100%);
  text-align: center;
  height: 100vh;
}

img {
  max-width: 400px;
  width: 80%;
  padding: 30px;
}
</style>
