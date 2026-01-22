<template>
    <div class="login-page" v-if="loaded">
    <div v-if="config.formPosition === 'center'" class="flex-container" :class="{'bg-image': !!bgImage}" centered>
      <LoginForm :auth-config="config">
        <template #header>
          <ContentBox v-if="config.slots?.loginHeader" :identifier="config.slots.loginHeader"/>
          <h1 v-else>{{ $t(config?.loginTitle || 'Welcome') }}</h1>
        </template>
        <template #footer v-if="config.slots?.loginFooter">
          <ContentBox :identifier="config.slots.loginFooter"/>
        </template>
      </LoginForm>
    </div>
    <template v-else>
      <aside :class="{'bg-image': !!bgImage}">
        <ContentBox v-if="(config.formPosition === 'left' || config.formPosition === 'right') && config.slots?.loginAside" :identifier="config.slots.loginAside"/>
        <template v-else>
          <img :alt="appConfig?.name || 'SaaS'" :src="appConfig?.logoUrl || '../../assets/logo.png'">
          <h1>{{ $t(config?.loginTitle || 'Welcome') }}</h1>
        </template>
      </aside>
      <div>
        <LoginForm :auth-config="config">
          <template #header v-if="config.slots?.loginHeader">
            <ContentBox :identifier="config.slots.loginHeader"/>
          </template>
          <template #footer v-if="config.slots?.loginFooter">
            <ContentBox :identifier="config.slots.loginFooter"/>
          </template>
        </LoginForm>
      </div>
    </template>
  </div>
  <div v-else>
      Loading configuration...
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs, watch, ref, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import LoginForm from './components/LoginForm.vue'
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import { useAuthConfiguration } from '@/modules/configurations/store/auth-configuration';
import { IAuthConfigurationMetadata } from '@qelos/global-types';
import ContentBox from '../pre-designed/components/ContentBox.vue';

const props = defineProps<{
  authConfig?: IAuthConfigurationMetadata
}>();

const authStore = useAuthConfiguration();

const { metadata, loaded } = toRefs(authStore);

const route = useRoute();

// Monitor the change of the 't' parameter in the URL and notify the store
watch(
  () => route.query.t, 
  (tokenId) => {
  // Call the store action to load the configuration for this tenantId
    authStore.loadForToken(typeof tokenId === 'string' ? tokenId : null);
  },
  { immediate: true } 
);

const config = computed(() => props.authConfig || metadata.value);
// Composition function for responsive orientation detection
const useOrientation = () => {
  const isVertical = ref(false)
  
  const updateOrientation = () => {
    isVertical.value = window.innerWidth <= 768
  }
  
  onMounted(() => {
    // Set initial value
    updateOrientation()
    // Add event listener for window resize
    window.addEventListener('resize', updateOrientation)
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', updateOrientation)
  })
  
  return { isVertical }
}

// Use the composition function
const { isVertical } = useOrientation()

const isMobile = computed(() => window.innerWidth <= 768)

const bgImage = computed(() => {
  // Use vertical background image for mobile if available
  if (isVertical.value && config.value.verticalBackgroundImage) {
    return 'url(' + config.value.verticalBackgroundImage + ')'
  }
  // Otherwise use standard background image
  return config.value.backgroundImage ? ('url(' + config.value.backgroundImage + ')') : ''
})

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
  background-color: var(--body-bg);
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
  height: 100%;
  width: 100%;
  flex-direction: column;
  box-sizing: border-box;
  overflow: auto;
}

img {
  max-width: 400px;
  width: 80%;
  padding: 30px;
}

.bg-image {
  background: v-bind(bgImage) no-repeat center;
  background-size: cover;
}

.vertical-bg {
  background-position: center;
  background-size: cover;
}
</style>
