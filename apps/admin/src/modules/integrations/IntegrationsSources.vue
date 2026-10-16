<script setup lang="ts">
import AppPage from '@/modules/core/components/layout/AppPage.vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ArrowDown, Delete, Plus } from '@element-plus/icons-vue';
import { IntegrationSourceKind, STATUS_CHECK_SUPPORTED_INTEGRATION_SOURCE_KINDS, type IIntegrationSourceStatusResult } from '@qelos/global-types';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import integrationSourcesService from '@/services/apis/integration-sources-service';
import { useConfirmAction } from '../core/compositions/confirm-action';
import ConnectionDrawer from '@/modules/integrations/components/connections/ConnectionDrawer.vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useSecuredHeadersMasked } from './compositions/use-secured-headers-masked';
import { useConnectionOptions } from './compositions/connection-options';
import { formatRelative } from '@/modules/admins/services/event-presentation';

const { securedHeadersMasked } = useSecuredHeadersMasked();
const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

const kind = computed(() => route.params.kind.toString() as IntegrationSourceKind);
const kindData = computed(() => (useIntegrationKinds() as Record<string, { logo?: string; name: string }>)[kind.value]);
const store = useIntegrationSourcesStore();
const connections = computed(() => (store.groupedSources?.[kind.value] || []) as any[]);
const templates = computed(() => useConnectionOptions(kind.value));
const canTest = computed(() => STATUS_CHECK_SUPPORTED_INTEGRATION_SOURCE_KINDS.includes(kind.value));

const formVisible = ref(false);
const editing = ref<any>(null);

function defaultMetadata(k: IntegrationSourceKind): Record<string, unknown> {
  if (k === 'linkedin' || k === 'google' || k === 'github') return { scope: 'openid email profile' };
  if (k === 'facebook') return { scope: 'openid email public_profile' };
  return {};
}

const create = () => {
  editing.value = { kind: kind.value, name: '', labels: [], metadata: defaultMetadata(kind.value), authentication: {} };
  formVisible.value = true;
};

const edit = (connection: any) => {
  editing.value = { ...connection, authentication: connection.authentication || {} };
  formVisible.value = true;
};

function fromTemplate(value: string) {
  const option = templates.value.find((entry) => entry.value === value);
  if (!option) return;
  edit({
    ...option.data,
    authentication: { ...option.data?.authentication },
    name: option.label,
    kind: kind.value,
    labels: [],
    metadata: { ...defaultMetadata(kind.value), ...option.data?.metadata },
  });
}

const { submit: save, submitting } = useSubmitting(
  async (data: any) => {
    const saved = editing.value?._id ? await integrationSourcesService.update(editing.value._id, data) : await integrationSourcesService.create(data);
    await store.retry();
    return saved;
  },
  { success: () => (editing.value?._id ? 'Connection updated successfully' : 'Connection created successfully'), error: 'Failed to save connection' },
  () => (formVisible.value = false),
);

const { submit: removeBase } = useSubmitting(
  async (id: string) => {
    await integrationSourcesService.remove(id);
    await store.retry();
    if (Object.keys(securedHeadersMasked.value).length > 0) securedHeadersMasked.value = {};
    return id;
  },
  { success: 'Connection deleted successfully', error: 'Failed to delete connection' },
);
const remove = useConfirmAction(removeBase, { text: 'Are you sure you want to delete this connection?', title: 'Confirm Delete', type: 'warning' });

// ---- test a saved connection ----
const results = ref<Record<string, IIntegrationSourceStatusResult | { status: 'failed'; message: string; checkedAt: string }>>({});
const testing = ref<Record<string, boolean>>({});
async function test(connection: any) {
  testing.value[connection._id] = true;
  try {
    results.value[connection._id] = await integrationSourcesService.checkStatus(connection._id);
  } catch (error: any) {
    results.value[connection._id] = { status: 'failed', message: error?.response?.data?.message || error?.message || t('Connection check failed'), checkedAt: new Date().toISOString() };
  } finally {
    testing.value[connection._id] = false;
  }
}
const ok = (id: string) => results.value[id]?.status === 'connected';
const when = (id: string) => (results.value[id]?.checkedAt ? formatRelative(results.value[id].checkedAt, new Date(), locale.value || undefined) : '');

// the few fields worth showing under the name
const details = (connection: any) =>
  [
    ['URL', connection.metadata?.url],
    ['Base Url', connection.metadata?.baseUrl],
    ['Client ID', connection.metadata?.clientId],
    ['Scope', connection.metadata?.scope],
    ['API Endpoint', connection.metadata?.apiEndpoint],
  ].filter(([, value]) => !!value) as [string, string][];
</script>

<template>
  <AppPage
    :title="kindData?.name || kind"
    :subtitle="$t('{count} connections', { count: connections.length })"
    :back="{ label: $t('Connections'), to: { name: 'integrations', query: { view: 'connections' } } }"
  >
    <template v-if="kindData?.logo" #lead><img class="logo" :alt="kindData.name" :src="kindData.logo" /></template>
    <template #actions>
      <el-dropdown v-if="templates.length" trigger="click" @command="fromTemplate">
        <el-button>{{ $t('From a template') }}<el-icon class="caret"><ArrowDown /></el-icon></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="option in templates" :key="option.value" :command="option.value">{{ option.label }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button type="primary" @click="create"><el-icon><Plus /></el-icon>{{ $t('Create Connection') }}</el-button>
    </template>

    <el-skeleton v-if="!store.loaded" :rows="4" animated />

    <div v-else-if="!connections.length" class="empty">
      <h2>{{ $t('No connections yet') }}</h2>
      <p>{{ $t('No connections found. Create one to get started.') }}</p>
      <el-button type="primary" @click="create">{{ $t('Create Connection') }}</el-button>
    </div>

    <ul v-else class="rows">
      <li v-for="connection in connections" :key="connection._id" class="row">
        <div class="main">
          <strong class="name" dir="auto">{{ connection.name }}</strong>
          <p v-if="connection.labels?.length" class="labels"><el-tag v-for="label in connection.labels" :key="label" size="small" effect="plain">{{ label }}</el-tag></p>
          <dl class="details">
            <div v-for="[label, value] in details(connection)" :key="label"><dt>{{ $t(label) }}</dt><dd dir="ltr">{{ value }}</dd></div>
          </dl>
          <p v-if="results[connection._id]" class="result" :class="{ ok: ok(connection._id) }" role="status">
            <font-awesome-icon :icon="['fas', ok(connection._id) ? 'circle-check' : 'circle-xmark']" aria-hidden="true" />
            <span dir="auto">{{ results[connection._id].message || (ok(connection._id) ? $t('Connected') : $t('Connection failed')) }}</span>
            <span class="when">{{ when(connection._id) }}</span>
          </p>
        </div>
        <div class="actions">
          <el-button v-if="canTest" size="small" :loading="testing[connection._id]" @click="test(connection)">{{ $t('Test connection') }}</el-button>
          <el-button size="small" type="primary" plain @click="edit(connection)">{{ $t('Edit') }}</el-button>
          <el-button size="small" text circle type="danger" :aria-label="`${$t('Remove')}: ${connection.name}`" @click="remove(connection._id)"><el-icon><Delete /></el-icon></el-button>
        </div>
      </li>
    </ul>

    <ConnectionDrawer
      v-model:visible="formVisible"
      v-model:editing-integration="editing"
      :kind="kind"
      :save-loading="submitting"
      @save="save"
      @close="formVisible = false"
    />
  </AppPage>
</template>

<style scoped lang="scss">
.logo {
  inline-size: 32px;
  block-size: 32px;
  object-fit: contain;
}

.caret {
  margin-inline-start: 6px;
}

.rows {
  margin: 0;
  padding: 0;
  overflow: hidden;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);

  .row + .row {
    border-block-start: 1px solid var(--el-border-color-extra-light);
  }
}

.row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
}

.main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
  min-inline-size: 0;
}

.name {
  font-size: 1.02rem;
}

.labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
}

.details {
  display: grid;
  gap: 2px;
  margin: 0;

  div {
    display: flex;
    gap: 8px;
    min-inline-size: 0;
  }

  dt {
    flex: none;
    color: var(--el-text-color-secondary);
    font-size: 0.84rem;
  }

  dd {
    min-inline-size: 0;
    margin: 0;
    overflow: hidden;
    font-size: 0.86rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.result {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: var(--el-color-danger);
  font-size: 0.86rem;

  &.ok {
    color: var(--el-color-success);
  }
}

.when {
  color: var(--el-text-color-secondary);
}

.actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 6px;
}

.empty {
  padding: 40px 20px;
  border: 1px dashed var(--el-border-color);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  text-align: center;

  h2 {
    margin: 0 0 6px;
    padding: 0;
    font-size: 1.2rem;
  }

  p {
    margin: 0 0 14px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
}


@media (max-width: 639px) {
  .source-page {
    padding: 8px 12px 24px;
  }

  .row {
    flex-direction: column;
  }

  .actions {
    flex-wrap: wrap;
  }
}
</style>
