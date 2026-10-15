<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ArrowLeft, Bell, DataLine, Link, Setting, Share } from '@element-plus/icons-vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { useViewport } from '@/modules/core/compositions/viewport';
import { useCreatePlugin } from '../../compositions/manage-plugin';
import { usePluginsList } from '../../store/plugins-list';
import {
  STARTERS,
  buildPluginFromStarter,
  emptyStarterValues,
  isStarterKey,
  pluginFromManifest,
  proxyPreview,
  validateStarter,
  type StarterKey,
} from '../../services/new-plugin';

const visible = defineModel<boolean>('visible', { default: false });
const emit = defineEmits<{ (e: 'close'): void }>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = usePluginsList();
const { savePlugin, submitting } = useCreatePlugin();
const { isCompact } = useViewport();

const ICONS = { remote: Link, proxy: Share, events: Bell, analytics: DataLine, manual: Setting } as const;
const COPY: Record<StarterKey, { title: string; text: string }> = {
  remote: { title: 'Remote plugin', text: 'Connect a plugin that runs elsewhere. Its pages, endpoints and events load from a manifest.' },
  proxy: { title: 'API proxy', text: 'Forward requests from your app to another server.' },
  events: { title: 'Event listener', text: 'Call your server when something happens in your app.' },
  analytics: { title: 'HTML / script', text: 'Add tracking or custom code to every page.' },
  manual: { title: 'Start from scratch', text: 'An empty plugin. Add pages and settings yourself.' },
};

const step = computed(() => (isStarterKey(route.query.option) ? route.query.option : undefined));
const values = reactive(emptyStarterValues());
const submitted = ref(false);
const remoteError = ref('');
const loading = ref(false);

const errors = computed(() => (step.value ? validateStarter(step.value, values) : {}));
const shown = (field: keyof typeof values) => (submitted.value ? t(errors.value[field] || '') || undefined : undefined);
const preview = computed(() => proxyPreview(location.origin, values.apiPath, values.proxyUrl));

function reset() {
  Object.assign(values, emptyStarterValues());
  submitted.value = false;
  remoteError.value = '';
}

function pick(key: StarterKey) {
  if (key === 'manual') {
    router.push({ name: 'createPlugin' });
    return;
  }
  reset();
  router.push({ query: { ...route.query, option: key } });
  nextTick(() => document.querySelector<HTMLElement>('.new-plugin input, .new-plugin textarea')?.focus());
}

const back = () => router.push({ query: { ...route.query, option: undefined } });
function close() {
  emit('close');
}

async function submit() {
  const key = step.value;
  if (!key || key === 'manual') return;
  submitted.value = true;
  remoteError.value = '';
  if (Object.keys(errors.value).length) return;

  let plugin;
  if (key === 'remote') {
    loading.value = true;
    try {
      const response = await fetch(values.manifestUrl.trim(), { mode: 'cors' });
      if (!response.ok) throw new Error(String(response.status));
      plugin = pluginFromManifest(await response.json(), values.manifestUrl.trim());
    } catch {
      remoteError.value = t('Could not read a manifest at this address. Check the URL and that the server allows requests from this app.');
      return;
    } finally {
      loading.value = false;
    }
  } else {
    plugin = buildPluginFromStarter(key, values);
  }

  const created = await savePlugin(plugin);
  if (!created) return;
  await store.retry();
  const section = STARTERS.find((s) => s.key === key)!.section;
  router.push({ name: 'editPlugin', params: { pluginId: created._id }, query: { section } });
}

watch(visible, (open) => open && reset());
</script>

<template>
  <el-dialog v-model="visible" :title="step ? $t(COPY[step].title) : $t('New plugin')" :width="step ? '560px' : '680px'" :fullscreen="isCompact" class="new-plugin" append-to-body align-center @closed="emit('close')">
    <div v-if="!step" class="grid" role="list">
      <button v-for="starter in STARTERS" :key="starter.key" type="button" role="listitem" class="card" :class="{ wide: starter.key === 'manual' }" @click="pick(starter.key)">
        <el-icon class="icon" aria-hidden="true"><component :is="ICONS[starter.key]" /></el-icon>
        <span class="title">{{ $t(COPY[starter.key].title) }}</span>
        <span class="text">{{ $t(COPY[starter.key].text) }}</span>
      </button>
    </div>

    <el-form v-else label-position="top" class="form" @submit.prevent="submit">
      <p class="lead" dir="auto">{{ $t(COPY[step].text) }}</p>

      <template v-if="step === 'remote'">
        <el-form-item :label="$t('Manifest URL')" :error="shown('manifestUrl') || remoteError || undefined">
          <el-input v-model="values.manifestUrl" dir="ltr" type="url" placeholder="https://your-app.com/manifest.json" :disabled="loading" @input="remoteError = ''" />
        </el-form-item>
      </template>

      <template v-else>
        <el-form-item :label="$t('Plugin name')" :error="shown('name')">
          <el-input v-model="values.name" dir="auto" maxlength="80" />
        </el-form-item>

        <template v-if="step === 'proxy'">
          <el-form-item :label="$t('API path')" :error="shown('apiPath')">
            <el-input v-model="values.apiPath" dir="ltr" placeholder="orders" />
            <p class="preview" dir="ltr">{{ preview.from }}</p>
          </el-form-item>
          <el-form-item :label="$t('Server address')" :error="shown('proxyUrl')">
            <el-input v-model="values.proxyUrl" dir="ltr" type="url" placeholder="https://api.your-app.com" />
            <p class="preview" dir="ltr">→ {{ preview.to }}</p>
          </el-form-item>
          <el-form-item :label="$t('Token (optional)')">
            <el-input v-model="values.token" type="password" show-password autocomplete="off" />
            <p class="hint">{{ $t('Qelos sends it as a Bearer token with every request.') }}</p>
          </el-form-item>
        </template>

        <template v-else-if="step === 'events'">
          <el-form-item :label="$t('Events from')">
            <el-select v-model="values.eventSource">
              <el-option :label="$t('Blueprints')" value="blueprints" />
              <el-option :label="$t('Authentication')" value="auth" />
              <el-option :label="$t('Assets')" value="assets" />
              <el-option :label="$t('Plugin')" value="plugin" />
              <el-option :label="$t('(*) All')" value="*" />
            </el-select>
            <p class="hint">{{ $t('You pick the exact events next.') }}</p>
          </el-form-item>
          <el-form-item :label="$t('Your server address')" :error="shown('hookUrl')">
            <el-input v-model="values.hookUrl" dir="ltr" type="url" placeholder="https://api.your-app.com/hooks/qelos" />
          </el-form-item>
        </template>

        <el-form-item v-else-if="step === 'analytics'" :label="$t('HTML to add')" :error="shown('html')">
          <Monaco v-model="values.html" language="html" height="200px" />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <div class="footer">
        <el-button v-if="step" text :icon="ArrowLeft" class="back" :disabled="loading || submitting" @click="back">{{ $t('Back') }}</el-button>
        <el-button :disabled="loading || submitting" @click="close">{{ $t('Cancel') }}</el-button>
        <el-button v-if="step" type="primary" :loading="loading || submitting" @click="submit">{{ $t('Create and continue') }}</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.card {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas: 'icon title' 'icon text';
  column-gap: 14px;
  row-gap: 2px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &.wide {
    grid-column: 1 / -1;
  }

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.icon {
  grid-area: icon;
  align-self: start;
  padding: 10px;
  border-radius: 10px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 20px;
  box-sizing: content-box;
}

.title {
  grid-area: title;
  font-weight: 600;
}

.text {
  grid-area: text;
  color: var(--el-text-color-secondary);
  font-size: 0.88rem;
}

.form :deep(.el-form-item) {
  margin-block-end: 26px;
}

.lead {
  margin: 0 0 16px;
  padding: 0;
  color: var(--el-text-color-secondary);
  text-align: start;
}

.preview,
.hint {
  inline-size: 100%;
  margin: 4px 0 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  text-align: start;
}

.preview {
  font-family: var(--el-font-family-mono, ui-monospace, monospace);
  word-break: break-all;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.back {
  margin-inline-end: auto;
}

[dir='rtl'] .back :deep(.el-icon) {
  transform: scaleX(-1);
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
</style>
