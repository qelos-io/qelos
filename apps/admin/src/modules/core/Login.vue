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
  <div v-else class="loading-screen">
    <div class="loading-spinner"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs, watch, ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
const router = useRouter();

function readQueryValue(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0];
  }
  return null;
}

function buildMcpAuthorizeApiPath(query: Record<string, unknown>): string | null {
  const redirectUri = readQueryValue(query.redirect_uri);
  if (!redirectUri) {
    return null;
  }

  const params = new URLSearchParams({ redirect_uri: redirectUri });
  const state = readQueryValue(query.state);
  const codeChallenge = readQueryValue(query.code_challenge);
  const codeChallengeMethod = readQueryValue(query.code_challenge_method);
  const clientId = readQueryValue(query.client_id);
  const scope = readQueryValue(query.scope);

  if (state) params.set('state', state);
  if (codeChallenge) params.set('code_challenge', codeChallenge);
  if (codeChallengeMethod) params.set('code_challenge_method', codeChallengeMethod);
  if (clientId) params.set('client_id', clientId);
  if (scope) params.set('scope', scope);

  return `/api/auth/mcp/authorize?${params.toString()}`;
}

function resolveMcpLoginRedirect(): string | null {
  const redirect = readQueryValue(route.query.redirect);
  if (redirect) {
    return redirect;
  }

  const mcpState = readQueryValue(route.query.mcp_state);
  if (mcpState) {
    return `/mcp/authorize?mcp_state=${encodeURIComponent(mcpState)}`;
  }

  return buildMcpAuthorizeApiPath(route.query);
}

onMounted(() => {
  if (readQueryValue(route.query.redirect)) {
    return;
  }

  const mcpRedirect = resolveMcpLoginRedirect();
  if (mcpRedirect) {
    router.replace({
      path: route.path,
      query: {
        ...route.query,
        redirect: mcpRedirect,
      },
    });
  }
});

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

.loading-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  background-color: var(--body-bg);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color, #4f46e5);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
