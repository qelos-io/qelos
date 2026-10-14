<template>
  <div v-if="loaded" class="login-root" :class="{ preview }">
   <div
    class="login-page"
    :class="{ centered: isCentered, stacked: isStacked, 'has-bg': hasBg }"
    :style="[{ flexDirection: isCentered ? 'column' : direction }, bgVars]"
   >
    <template v-if="isCentered">
      <main class="form-pane">
        <LoginForm :auth-config="config" :preview="preview">
          <template #header>
            <ContentBox v-if="config.slots?.loginHeader" :identifier="config.slots.loginHeader" />
            <div v-else class="brand">
              <img v-if="appConfig?.logoUrl" class="brand-logo" :alt="appConfig?.name || ''" :src="appConfig.logoUrl" />
              <h1>{{ $t(config?.loginTitle || 'Welcome') }}</h1>
            </div>
          </template>
          <template #footer v-if="config.slots?.loginFooter">
            <ContentBox :identifier="config.slots.loginFooter" />
          </template>
        </LoginForm>
      </main>
    </template>
    <template v-else>
      <aside class="aside">
        <ContentBox v-if="config.slots?.loginAside" :identifier="config.slots.loginAside" />
        <div v-else class="brand">
          <img v-if="appConfig?.logoUrl" class="brand-logo" :alt="appConfig?.name || ''" :src="appConfig.logoUrl" />
          <h1>{{ $t(config?.loginTitle || 'Welcome') }}</h1>
        </div>
      </aside>
      <main class="form-pane">
        <LoginForm :auth-config="config" :preview="preview">
          <template #header v-if="config.slots?.loginHeader">
            <ContentBox :identifier="config.slots.loginHeader" />
          </template>
          <template #footer v-if="config.slots?.loginFooter">
            <ContentBox :identifier="config.slots.loginFooter" />
          </template>
        </LoginForm>
      </main>
    </template>
   </div>
  </div>
  <div v-else class="loading-screen" role="status" :aria-label="$t('Loading')">
    <div class="loading-spinner"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import LoginForm from './components/LoginForm.vue'
import { useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import { useAuthConfiguration } from '@/modules/configurations/store/auth-configuration';
import { IAuthConfigurationMetadata } from '@qelos/global-types';
import ContentBox from '../pre-designed/components/ContentBox.vue';

const props = defineProps<{
  authConfig?: IAuthConfigurationMetadata;
  /** rendered inside the auth configuration editor: no redirects, no submitting, sized by its container */
  preview?: boolean;
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
  if (props.preview) {
    return;
  }
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
  if (props.preview) {
    return;
  }
  // Call the store action to load the configuration for this tenantId
    authStore.loadForToken(typeof tokenId === 'string' ? tokenId : null);
  },
  { immediate: true }
);

const config = computed(() => props.authConfig || metadata.value);
// layout: the form position decides the order of the brand panel and the form
const direction = computed(() => {
  switch (config.value.formPosition) {
    case 'left':
      return 'row-reverse';
    case 'top':
      return 'column-reverse';
    case 'bottom':
      return 'column';
    default:
      return 'row';
  }
});

const isStacked = computed(() => config.value.formPosition === 'top' || config.value.formPosition === 'bottom');
const isCentered = computed(() => config.value.formPosition === 'center');

// the background images are set as variables so a container query can swap in the vertical one on narrow containers
const bgVars = computed(() => {
  const wide = config.value.backgroundImage ? `url("${config.value.backgroundImage}")` : '';
  const tall = config.value.verticalBackgroundImage ? `url("${config.value.verticalBackgroundImage}")` : wide;
  return { '--bg-wide': wide || 'none', '--bg-tall': tall || 'none' };
});
const hasBg = computed(() => !!config.value.backgroundImage || !!config.value.verticalBackgroundImage);

const { appConfig } = useAppConfiguration();
</script>
<style scoped lang="scss">
// the page is a size container, so the editor preview and the real page lay out the same way at the same width
.login-root {
  container-type: inline-size;
  container-name: login;
  block-size: 100%;
}

.login-page {
  display: flex;
  align-items: stretch;
  justify-content: center;
  min-block-size: 100%;
  background: var(--body-bg);
}

.preview .login-page {
  block-size: 100%;
}

.aside,
.form-pane {
  flex: 1 1 0;
  min-inline-size: 0;
}

.aside {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  overflow: auto;
  background: linear-gradient(318deg, var(--body-bg) 0%, var(--border-color) 100%);
  color: var(--el-text-color-primary);
  text-align: center;
}

.has-bg .aside,
.has-bg.centered {
  background-image: var(--bg-wide);
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
}

.form-pane {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  overflow: auto;
}

.centered .form-pane {
  flex: 0 1 auto;
  inline-size: 100%;
  max-inline-size: 520px;
  margin-block: auto;
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  inline-size: 100%;
  padding-block-end: 8px;

  h1 {
    margin: 0;
    font-size: clamp(1.5rem, 4cqi, 2.1rem);
    line-height: 1.2;
  }
}

.brand-logo {
  max-inline-size: min(260px, 70%);
  max-block-size: 90px;
  object-fit: contain;
}

.aside .brand-logo {
  max-block-size: 120px;
}

.stacked .aside,
.stacked .form-pane {
  flex: 0 0 auto;
}

.stacked .form-pane {
  flex: 1 1 auto;
}

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  block-size: 100%;
  background: var(--body-bg);
}

.loading-spinner {
  inline-size: 40px;
  block-size: 40px;
  border: 3px solid var(--border-color);
  border-block-start-color: var(--el-color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// narrow containers (phones, the editor's phone preview): the brand panel becomes a banner above the form
@container login (max-width: 720px) {
  .login-page:not(.centered) {
    flex-direction: column !important;
  }

  .aside {
    flex: 0 0 auto;
    padding: 24px 20px;
  }

  .brand-logo,
  .aside .brand-logo {
    max-block-size: 56px;
  }

  .form-pane {
    flex: 1 1 auto;
    align-items: flex-start;
    padding: 20px 16px 32px;
  }

  .has-bg .aside,
  .has-bg.centered {
    background-image: var(--bg-tall);
  }

  .centered .form-pane {
    align-items: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation-duration: 2s;
  }
}
</style>
