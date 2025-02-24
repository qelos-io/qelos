<template>
  <div class="login-page">
    <aside>
      <img :alt="appConfig?.name || 'SaaS'" :src="appConfig?.logoUrl || '../../assets/logo.png'">
      <h1>{{ $t(config?.loginTitle || 'Welcome') }}</h1>
    </aside>
    <div>
      <LoginForm :auth-config="config"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import LoginForm from './components/LoginForm.vue'
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import { IAuthConfigurationMetadata } from '@qelos/global-types';
import { useAuthConfiguration } from '@/modules/configurations/store/auth-configuration';

const props = defineProps<{ authConfig?: IAuthConfigurationMetadata }>()
const metadata = toRef(useAuthConfiguration(), 'metadata')
const config = computed(() => props.authConfig || metadata.value)

const flexDirection = computed(() => {
  switch (config.value.formPosition) {
    case 'right':
      return 'row'
    case 'bottom':
      return 'column'
    case 'left':
      return 'row-reverse'
    case 'top':
      return 'column-reverse'
  }
})

const { appConfig } = useAppConfiguration();
</script>
<style scoped>
.login-page {
  display: flex;
  flex-direction: v-bind(flexDirection);
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
  width: 100%;
}

img {
  max-width: 400px;
  width: 80%;
  padding: 30px;
}
</style>
