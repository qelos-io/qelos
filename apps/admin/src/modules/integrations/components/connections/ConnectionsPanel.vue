<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowDown, Plus } from '@element-plus/icons-vue';
import { DEFAULT_AI_MODEL_BY_PROVIDER, IntegrationSourceKind } from '@qelos/global-types';
import integrationSourcesService from '@/services/apis/integration-sources-service';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import ConnectionDrawer from './ConnectionDrawer.vue';
import { useIntegrationKinds } from '../../compositions/integration-kinds';
import { useIntegrationSourcesStore } from '../../store/integration-sources';

type KindOption = { logo?: string; name: string; kind: IntegrationSourceKind };

const router = useRouter();
const store = useIntegrationSourcesStore();
const kinds = useIntegrationKinds();

const catalog = computed<KindOption[]>(() => (Object.values(kinds) as KindOption[]).sort((a, b) => a.name.localeCompare(b.name)));
const sourcesOf = (kind: string) => (store.groupedSources?.[kind as IntegrationSourceKind] || []) as any[];

const connected = computed(() => catalog.value.filter((entry) => sourcesOf(entry.kind).length));
const available = computed(() => catalog.value.filter((entry) => !sourcesOf(entry.kind).length));
const total = computed(() => connected.value.reduce((sum, entry) => sum + sourcesOf(entry.kind).length, 0));

// ---- create ----
const formVisible = ref(false);
const editing = ref<any>(null);
const formKind = ref('');

function defaultMetadata(kind: IntegrationSourceKind) {
  switch (kind) {
    case IntegrationSourceKind.LinkedIn:
      return { scope: 'openid email profile' };
    case IntegrationSourceKind.Facebook:
      return { scope: 'openid email public_profile' };
    case IntegrationSourceKind.Google:
    case IntegrationSourceKind.GitHub:
      return { scope: 'openid email profile' };
    case IntegrationSourceKind.OpenAI:
      return { defaultModel: DEFAULT_AI_MODEL_BY_PROVIDER.openai };
    case IntegrationSourceKind.ClaudeAi:
      return { defaultModel: DEFAULT_AI_MODEL_BY_PROVIDER.claude };
    case IntegrationSourceKind.Gemini:
      return { defaultModel: DEFAULT_AI_MODEL_BY_PROVIDER.gemini };
    default:
      return {};
  }
}

function add(kind: IntegrationSourceKind) {
  formKind.value = kind;
  editing.value = { kind, name: '', labels: [], metadata: defaultMetadata(kind), authentication: {} };
  formVisible.value = true;
}

const { submit: save, submitting } = useSubmitting(
  async (data: any) => {
    const saved = await integrationSourcesService.create(data);
    await store.retry();
    return saved;
  },
  { success: 'Connection created successfully', error: 'Failed to save connection' },
  () => {
    formVisible.value = false;
    editing.value = null;
  },
);

const manage = (kind: string) => router.push({ name: 'integrations-sources', params: { kind } });
</script>

<template>
  <section class="connections" :aria-label="$t('Connections')">
    <header class="head">
      <p class="summary">
        <template v-if="connected.length">{{ $t('{providers} providers · {connections} total', { providers: connected.length, connections: total }) }}</template>
        <template v-else>{{ $t('No active connections yet') }}</template>
      </p>
      <el-dropdown trigger="click" max-height="360" @command="add">
        <el-button type="primary"><el-icon><Plus /></el-icon>{{ $t('Add connection') }}<el-icon class="caret"><ArrowDown /></el-icon></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="entry in catalog" :key="entry.kind" :command="entry.kind">
              <img v-if="entry.logo" :src="entry.logo" alt="" class="menu-logo" />{{ entry.name }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </header>

    <el-skeleton v-if="!store.loaded" :rows="3" animated />

    <template v-else>
      <ul v-if="connected.length" class="cards">
        <li v-for="entry in connected" :key="entry.kind" class="card">
          <button type="button" class="card-main" @click="manage(entry.kind)">
            <img v-if="entry.logo" :src="entry.logo" :alt="entry.name" class="logo" />
            <span v-else class="logo fallback" aria-hidden="true">{{ entry.name.slice(0, 1) }}</span>
            <span class="text">
              <strong class="name">{{ entry.name }}</strong>
              <span class="count">{{ $t('{count} connections', { count: sourcesOf(entry.kind).length }) }}</span>
              <span class="names" dir="auto">{{ sourcesOf(entry.kind).map((source) => source.name).join(', ') }}</span>
            </span>
          </button>
          <div class="card-actions">
            <el-button size="small" @click="manage(entry.kind)">{{ $t('Manage') }}</el-button>
            <el-button size="small" text type="primary" @click="add(entry.kind)">{{ $t('Add') }}</el-button>
          </div>
        </li>
      </ul>

      <template v-if="available.length">
        <h2 class="sub">{{ connected.length ? $t('Connect another service') : $t('Connect your first service') }}</h2>
        <ul class="tiles">
          <li v-for="entry in available" :key="entry.kind">
            <button type="button" class="tile" @click="add(entry.kind)">
              <img v-if="entry.logo" :src="entry.logo" alt="" class="tile-logo" />
              <span v-else class="tile-logo fallback" aria-hidden="true">{{ entry.name.slice(0, 1) }}</span>
              <span class="tile-name">{{ entry.name }}</span>
            </button>
          </li>
        </ul>
      </template>
    </template>

    <ConnectionDrawer
      v-model:visible="formVisible"
      v-model:editing-integration="editing"
      :kind="formKind"
      :save-loading="submitting"
      @save="save"
      @close="formVisible = false"
    />
  </section>
</template>

<style scoped lang="scss">
.connections {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summary {
  margin: 0;
  color: var(--el-text-color-secondary);
}

.caret {
  margin-inline-start: 6px;
}

.menu-logo {
  inline-size: 18px;
  block-size: 18px;
  margin-inline-end: 8px;
  object-fit: contain;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
}

.card-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 4px;
  }
}

.logo {
  flex: none;
  inline-size: 40px;
  block-size: 40px;
  object-fit: contain;
}

.fallback {
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--el-fill-color);
  color: var(--el-text-color-secondary);
  font-weight: 700;
}

.text {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.name {
  color: var(--el-text-color-primary);
}

.count {
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.names {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sub {
  margin: 10px 0 0;
  padding: 0;
  font-size: 1rem;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tile {
  display: flex;
  align-items: center;
  gap: 10px;
  inline-size: 100%;
  padding: 10px 12px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.tile-logo {
  flex: none;
  inline-size: 26px;
  block-size: 26px;
  object-fit: contain;
}

.tile-name {
  overflow: hidden;
  font-size: 0.9rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
