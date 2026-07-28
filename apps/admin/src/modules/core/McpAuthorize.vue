<template>
  <div class="mcp-authorize-page">
    <div v-if="loading" class="mcp-authorize-card">
      <p>{{ $t('MCP authorize loading') }}</p>
    </div>

    <div v-else-if="error" class="mcp-authorize-card mcp-authorize-card--error">
      <h1>{{ $t('MCP authorize error title') }}</h1>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="adminOnlyBlocked" class="mcp-authorize-card mcp-authorize-card--warning">
      <h1>{{ $t('MCP authorize admin required title') }}</h1>
      <p>{{ $t('MCP authorize admin required description') }}</p>
      <el-button @click="denyConsent">{{ $t('MCP authorize deny') }}</el-button>
    </div>

    <div v-else-if="!mcpConfig.isEnabled" class="mcp-authorize-card mcp-authorize-card--warning">
      <h1>{{ $t('MCP is disabled') }}</h1>
      <p>{{ $t('MCP disabled description') }}</p>
    </div>

    <div v-else class="mcp-authorize-card">
      <div class="mcp-authorize-icon">
        <font-awesome-icon :icon="['fas', 'plug']" />
      </div>
      <h1>{{ $t('MCP authorize title') }}</h1>
      <p class="mcp-authorize-lead">{{ $t('MCP authorize description') }}</p>

      <dl class="mcp-authorize-details">
        <div>
          <dt>{{ $t('MCP authorize client label') }}</dt>
          <dd dir="ltr">{{ clientLabel }}</dd>
        </div>
        <div v-if="redirectUri">
          <dt>{{ $t('MCP authorize redirect label') }}</dt>
          <dd dir="ltr">{{ redirectUri }}</dd>
        </div>
        <div v-if="clientId">
          <dt>{{ $t('MCP authorize client id label') }}</dt>
          <dd dir="ltr">{{ clientId }}</dd>
        </div>
        <div v-if="scopes.length">
          <dt>{{ $t('MCP authorize scopes label') }}</dt>
          <dd>
            <el-tag v-for="scope in scopes" :key="scope" size="small" class="scope-tag">{{ scope }}</el-tag>
          </dd>
        </div>
      </dl>

      <div class="mcp-authorize-actions">
        <el-button :loading="submitting" type="primary" @click="acceptConsent">
          {{ $t('MCP authorize accept') }}
        </el-button>
        <el-button :disabled="submitting" @click="denyConsent">
          {{ $t('MCP authorize deny') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { fetchAuthUser, isAdmin } from '@/modules/core/store/auth';
import { useMcpConfiguration } from '@/modules/configurations/store/mcp-configuration';

interface McpOAuthStatePayload {
  ru?: string;
  s?: string;
  cc?: string;
  ccm?: string;
  t?: string;
  cid?: string;
}

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const mcpConfig = useMcpConfiguration();

const loading = ref(true);
const submitting = ref(false);
const error = ref('');
const mcpState = ref('');
const redirectUri = ref('');
const clientId = ref('');
const oauthState = ref<string | null>(null);

const scopes = computed(() => {
  const raw = route.query.scope;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[\s,]+/).filter(Boolean);
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((value) => (typeof value === 'string' ? value.split(/[\s,]+/) : [])).filter(Boolean);
  }
  return [];
});

const clientLabel = computed(() => formatRedirectTarget(redirectUri.value));

const adminOnlyBlocked = computed(() => mcpConfig.metadata.adminOnly && !isAdmin.value);

onMounted(async () => {
  console.log('[MCP Authorize] Route query:', route.query);
  const user = await fetchAuthUser(false, true);
  if (!user) {
    console.log('[MCP Authorize] No user, redirecting to login');
    router.replace({
      name: 'login',
      query: { redirect: route.fullPath },
    });
    return;
  }

  await mcpConfig.promise;
  console.log('[MCP Authorize] MCP config loaded:', mcpConfig.metadata);

  const packedState = typeof route.query.mcp_state === 'string' ? route.query.mcp_state : '';
  if (packedState) {
    console.log('[MCP Authorize] Packed state found:', packedState);
    mcpState.value = packedState;
    const payload = decodeJwtPayload(packedState) as McpOAuthStatePayload | null;
    console.log('[MCP Authorize] Decoded payload:', payload);
    if (!payload?.ru) {
      console.error('[MCP Authorize] Invalid state: missing redirect URI');
      error.value = t('MCP authorize invalid state');
      loading.value = false;
      return;
    }
    redirectUri.value = payload.ru;
    clientId.value = payload.cid || '';
    oauthState.value = payload.s ?? null;
    console.log('[MCP Authorize] State parsed successfully:', { redirectUri: redirectUri.value, clientId: clientId.value, oauthState: oauthState.value });
    loading.value = false;
    return;
  }

  const authorizePath = buildAuthorizeApiPath(route.query);
  if (authorizePath) {
    console.log('[MCP Authorize] Redirecting to authorize path:', authorizePath);
    window.location.href = authorizePath;
    return;
  }

  console.error('[MCP Authorize] Missing state parameter');
  error.value = t('MCP authorize missing state');
  loading.value = false;
});

async function submitConsent(action: 'accept' | 'deny') {
  if (!mcpState.value || submitting.value) {
    console.log('[MCP Consent] Submit blocked:', { hasState: !!mcpState.value, submitting: submitting.value });
    return;
  }

  submitting.value = true;
  error.value = '';

  console.log('[MCP Consent] Submitting consent via form:', { action, mcpState: mcpState.value });

  try {
    // Create a hidden form to submit the consent
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/auth/mcp/consent';
    form.style.display = 'none';

    const mcpStateInput = document.createElement('input');
    mcpStateInput.type = 'hidden';
    mcpStateInput.name = 'mcp_state';
    mcpStateInput.value = mcpState.value;
    form.appendChild(mcpStateInput);

    const actionInput = document.createElement('input');
    actionInput.type = 'hidden';
    actionInput.name = 'action';
    actionInput.value = action;
    form.appendChild(actionInput);

    document.body.appendChild(form);
    form.submit();
    // The browser will handle the redirect automatically
  } catch (e) {
    console.error('[MCP Consent] Form submission failed:', e);
    error.value = t('MCP authorize consent failed');
    submitting.value = false;
  }
}

function acceptConsent() {
  return submitConsent('accept');
}

function denyConsent() {
  if (redirectUri.value) {
    window.location.href = appendAccessDeniedRedirect(redirectUri.value, oauthState.value);
    return;
  }
  return submitConsent('deny');
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function buildAuthorizeApiPath(query: Record<string, string | string[] | undefined | null>): string | null {
  const redirectUriParam = readQueryValue(query.redirect_uri);
  if (!redirectUriParam) {
    return null;
  }

  const params = new URLSearchParams({ redirect_uri: redirectUriParam });
  const state = readQueryValue(query.state);
  const codeChallenge = readQueryValue(query.code_challenge);
  const codeChallengeMethod = readQueryValue(query.code_challenge_method);
  const clientIdParam = readQueryValue(query.client_id);
  const scope = readQueryValue(query.scope);

  if (state) params.set('state', state);
  if (codeChallenge) params.set('code_challenge', codeChallenge);
  if (codeChallengeMethod) params.set('code_challenge_method', codeChallengeMethod);
  if (clientIdParam) params.set('client_id', clientIdParam);
  if (scope) params.set('scope', scope);

  return `/api/auth/mcp/authorize?${params.toString()}`;
}

function readQueryValue(value: string | string[] | undefined | null): string | null {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0];
  }
  return null;
}

function formatRedirectTarget(uri: string): string {
  if (!uri) {
    return '';
  }
  if (/^cursor:\/\//i.test(uri)) {
    return 'Cursor';
  }
  if (/^https:\/\/(claude\.ai|.*\.anthropic\.com)/i.test(uri)) {
    return 'Claude';
  }
  if (/^https:\/\/(chatgpt\.com|.*\.openai\.com)/i.test(uri)) {
    return 'Codex / ChatGPT';
  }
  if (/^https:\/\/(.*\.)?devin\.ai/i.test(uri)) {
    return 'Devin';
  }
  if (/^https:\/\/(.*\.)?mintmcp\.com/i.test(uri)) {
    return 'mintMCP';
  }
  if (/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/mcp\/oauth\/callback/i.test(uri)) {
    return 'OpenCode';
  }
  if (/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/callback(?:[/?#]|$)/i.test(uri)) {
    return 'Claude Code';
  }
  if (/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/oauth\/callback/i.test(uri)) {
    return 'Gemini CLI';
  }

  try {
    const url = new URL(uri);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.origin + url.pathname;
    }
    return `${url.protocol}//${url.host || url.pathname}`;
  } catch {
    return uri;
  }
}

function appendAccessDeniedRedirect(uri: string, state?: string | null): string {
  try {
    const url = new URL(uri);
    url.searchParams.set('error', 'access_denied');
    if (state) {
      url.searchParams.set('state', state);
    }
    return url.toString();
  } catch {
    const separator = uri.includes('?') ? '&' : '?';
    let result = `${uri}${separator}error=access_denied`;
    if (state) {
      result += `&state=${encodeURIComponent(state)}`;
    }
    return result;
  }
}
</script>

<style scoped>
.mcp-authorize-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  padding: 24px;
  background-color: var(--body-bg);
  box-sizing: border-box;
}

.mcp-authorize-card {
  width: 100%;
  max-width: 520px;
  padding: 32px;
  background: #fff;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  text-align: center;
}

.mcp-authorize-card--error,
.mcp-authorize-card--warning {
  text-align: start;
}

.mcp-authorize-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-block-end: 16px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--primary-color, #4f46e5) 12%, transparent);
  color: var(--primary-color, #4f46e5);
  font-size: 24px;
}

.mcp-authorize-lead {
  color: var(--text-muted, #666);
  margin-block: 0 24px;
}

.mcp-authorize-details {
  margin: 0 0 24px;
  padding: 16px;
  border-radius: calc(var(--border-radius) * 0.8);
  background: var(--body-bg);
  text-align: start;
}

.mcp-authorize-details div + div {
  margin-block-start: 12px;
}

.mcp-authorize-details dt {
  font-size: 0.85rem;
  color: var(--text-muted, #666);
  margin-block-end: 4px;
}

.mcp-authorize-details dd {
  margin: 0;
  word-break: break-all;
}

.scope-tag {
  margin-inline-end: 6px;
  margin-block-end: 6px;
}

.mcp-authorize-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

html[data-dark-mode="true"] .mcp-authorize-card {
  background: var(--body-bg);
}
</style>
