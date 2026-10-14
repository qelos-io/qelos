<template>
  <div class="home">
    <HomeStatus :loading="loadingHealth" :events="throughput24h" :errors="errorSignals24h" :rate="errorRateDisplay">
      <OpenAiAlert v-if="!groupedSources.openai?.length" />
    </HomeStatus>

    <HomeTiles :tiles="tiles" :addable="addableBlueprints" @add="addBlueprintToDashboard" @remove="removeBlueprintFromDashboard" />

    <div class="two-col">
      <HomeActivity
        :data="entityActivityEvents"
        :platform="recentPlatformEvents"
        :loading-data="loadingEntityEvents"
        :loading-platform="loadingRecentEvents"
        :blueprint-label="blueprintLabel"
      />
      <HomeAiUsage :tokens-day="tokensDay" :tokens-week="tokensWeek" :threads="recentThreads" :loading="loadingThreads" />
    </div>

    <section class="card chart" :aria-label="$t('Signups & workspace activity')">
      <header class="chart-head">
        <h2>{{ $t('Signups & workspace activity') }}</h2>
        <el-segmented
          v-model="activityTimeframe"
          size="small"
          :options="[
            { label: $t('24h'), value: 'day' },
            { label: $t('Week'), value: 'week' },
            { label: $t('Month'), value: 'month' },
          ]"
          :aria-label="$t('Timeframe')"
        />
      </header>
      <VChart v-if="themedChart" :option="themedChart" height="280px" autoresize />
    </section>

    <HomeShortcuts :actions="quickActions" :mcp-enabled="!!mcpConfig.isEnabled" :mcp-loading="!!mcpConfig.loading" />
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBlocksList } from '@/modules/blocks/store/blocks-list';
import HomeStatus from './home/HomeStatus.vue';
import HomeTiles, { type HomeTile } from './home/HomeTiles.vue';
import HomeActivity from './home/HomeActivity.vue';
import HomeAiUsage from './home/HomeAiUsage.vue';
import HomeShortcuts from './home/HomeShortcuts.vue';
import { useUsersStats } from '@/modules/users/compositions/users-stats';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import VChart from '@/modules/pre-designed/components/VChart.vue';
import { useAdminEvents } from '@/modules/core/store/admin-events';
import { authStore } from '@/modules/core/store/auth';
import { api } from '@/services/apis/api';
import { useUserMetadataStore } from '@/modules/core/store/user-metadata';
import OpenAiAlert from '@/modules/core/components/forms/OpenAiAlert.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import sdk from '@/services/sdk';
import eventsService, { type IEvent } from '@/services/apis/events-service';
import type { IThread } from '@qelos/sdk/ai';
import { useMcpConfiguration } from '@/modules/configurations/store/mcp-configuration';

const { loading: loadingBlocks, blocks } = toRefs(useBlocksList());
const { loading: loadingStats, stats } = useUsersStats();
const { activityChartOption, activityTimeframe } = toRefs(useAdminEvents());
const { t } = useI18n();

const wsConfig = useWsConfiguration();
const mcpConfig = useMcpConfiguration();
const { groupedSources } = toRefs(useIntegrationSourcesStore());

const pluginsStore = usePluginsList();
const { loading: loadingPlugins, plugins } = toRefs(pluginsStore);

const blueprintsStore = useBlueprintsStore();
const { loading: loadingBlueprints, blueprints } = toRefs(blueprintsStore);

const quickActions = [
  { text: t('Create entity'), icon: ['fas', 'cube'], route: '/no-code/blueprints' },
  { text: t('Manage AI & integrations'), icon: ['fas', 'robot'], route: '/integrations' },
  { text: t('API keys'), icon: ['fas', 'key'], route: '/users/me/api-tokens' },
  { text: t('Events Log'), icon: ['fas', 'clipboard-list'], route: '/admin/log' },
  { text: t('Create Blueprint'), icon: ['fas', 'plus-circle'], route: { name: 'createBlueprint' } },
  { text: t('Manage Users'), icon: ['fas', 'users-cog'], route: '/users' },
];

const blueprintCounts = ref<Record<string, { loading: boolean; count: number }>>({});
const userMetadataStore = useUserMetadataStore();

const loadingEntityEvents = ref(false);
const entityActivityEvents = ref<IEvent[]>([]);

const loadingThreads = ref(false);
const recentThreads = ref<IThread[]>([]);

const tokensWeek = ref(0);
const tokensDay = ref(0);

const loadingRecentEvents = ref(false);
const recentPlatformEvents = ref<IEvent[]>([]);

const loadingHealth = ref(false);
const throughput24h = ref(0);
const aiProviderErrors24h = ref(0);
const authFailures24h = ref(0);

const errorSignals24h = computed(() => aiProviderErrors24h.value + authFailures24h.value);

const errorRateDisplay = computed(() => {
  const d = throughput24h.value;
  if (!d) return '—';
  const pct = (errorSignals24h.value / d) * 100;
  return `${pct < 0.01 ? pct.toFixed(3) : pct.toFixed(2)}%`;
});

function blueprintLabel(identifier: string) {
  const bp = blueprints.value.find((b) => b.identifier === identifier);
  return bp?.name || identifier;
}

async function loadEntityActivity() {
  loadingEntityEvents.value = true;
  try {
    const res = await eventsService.getAll({
      source: 'blueprints',
      period: 'last-week',
      limit: 20,
      page: 0,
    });
    entityActivityEvents.value = res.events || [];
  } catch {
    entityActivityEvents.value = [];
  } finally {
    loadingEntityEvents.value = false;
  }
}

async function loadAiActivity() {
  loadingThreads.value = true;
  try {
    const [threads, sumWeek, sumDay] = await Promise.all([
      sdk.ai.threads.list({ limit: 12, sort: '-updated' }),
      eventsService.getSum({
        sum: 'usage.total_tokens',
        kind: 'ai_service',
        eventName: 'token_usage',
        period: 'last-week',
      }),
      eventsService.getSum({
        sum: 'usage.total_tokens',
        kind: 'ai_service',
        eventName: 'token_usage',
        period: 'last-day',
      }),
    ]);
    recentThreads.value = Array.isArray(threads) ? threads : [];
    tokensWeek.value = 'sum' in sumWeek ? sumWeek.sum : 0;
    tokensDay.value = 'sum' in sumDay ? sumDay.sum : 0;
  } catch {
    recentThreads.value = [];
    tokensWeek.value = 0;
    tokensDay.value = 0;
  } finally {
    loadingThreads.value = false;
  }
}

async function loadRecentPlatformEvents() {
  loadingRecentEvents.value = true;
  try {
    const res = await eventsService.getAll({
      period: 'last-week',
      limit: 15,
      page: 0,
    });
    recentPlatformEvents.value = res.events || [];
  } catch {
    recentPlatformEvents.value = [];
  } finally {
    loadingRecentEvents.value = false;
  }
}

async function loadHealth() {
  loadingHealth.value = true;
  try {
    const [through, aiErr, authFail] = await Promise.all([
      eventsService.getCount({ period: 'last-day' }),
      eventsService.getCount({ period: 'last-day', kind: 'ai_provider' }),
      eventsService.getCount({ period: 'last-day', kind: 'failed-social-login', source: 'auth' }),
    ]);
    throughput24h.value = through.count;
    aiProviderErrors24h.value = aiErr.count;
    authFailures24h.value = authFail.count;
  } catch {
    throughput24h.value = 0;
    aiProviderErrors24h.value = 0;
    authFailures24h.value = 0;
  } finally {
    loadingHealth.value = false;
  }
}

onMounted(async () => {
  if (authStore.user) {
    await userMetadataStore.promise;
    for (const identifier of userMetadataStore.selectedDashboardBlueprints) {
      await loadBlueprintCount(identifier);
    }
  }

  await Promise.all([
    loadEntityActivity(),
    loadAiActivity(),
    loadRecentPlatformEvents(),
    loadHealth(),
  ]);
});

const availableBlueprints = computed(() => {
  return blueprints.value.filter((blueprint) => !userMetadataStore.selectedDashboardBlueprints.includes(blueprint.identifier));
});

const blueprintStatusCards = computed(() => {
  return userMetadataStore.selectedDashboardBlueprints.map((identifier) => {
    const blueprint = blueprints.value.find((bp) => bp.identifier === identifier);
    const countData = blueprintCounts.value[identifier] || { loading: true, count: 0 };

    return {
      identifier,
      name: blueprint?.name || identifier,
      description: blueprint?.description || '',
      loading: countData.loading,
      count: countData.count,
    };
  });
});

async function loadBlueprintCount(identifier: string) {
  blueprintCounts.value[identifier] = { loading: true, count: 0 };

  try {
    const response = await api.get(`/api/blueprints/${identifier}/charts/count`);
    blueprintCounts.value[identifier] = {
      loading: false,
      count: response.data.count || 0,
    };
  } catch (error) {
    console.error(`Failed to load count for blueprint ${identifier}:`, error);
    blueprintCounts.value[identifier] = { loading: false, count: 0 };
  }
}

async function addBlueprintToDashboard(identifier: string) {
  if (!identifier || !authStore.user) return;

  const updatedBlueprints = [...userMetadataStore.selectedDashboardBlueprints, identifier];

  try {
    await userMetadataStore.updateSelectedDashboardBlueprints(updatedBlueprints);
    await loadBlueprintCount(identifier);
  } catch (error) {
    console.error('Failed to add blueprint to dashboard:', error);
  }
}

async function removeBlueprintFromDashboard(identifier: string) {
  if (!authStore.user) return;

  const updatedBlueprints = userMetadataStore.selectedDashboardBlueprints.filter((id) => id !== identifier);

  try {
    await userMetadataStore.updateSelectedDashboardBlueprints(updatedBlueprints);

    delete blueprintCounts.value[identifier];
  } catch (error) {
    console.error('Failed to remove blueprint from dashboard:', error);
  }
}

// ---- home view models ----
const tiles = computed<HomeTile[]>(() => {
  const list: HomeTile[] = [
    { key: 'users', label: t('Users'), value: stats.value?.users, loading: loadingStats.value, icon: ['fas', 'users'], to: '/users' },
  ];
  if (wsConfig.isActive) {
    list.push({ key: 'workspaces', label: t('Workspaces'), value: stats.value?.workspaces, loading: loadingStats.value, icon: ['fas', 'briefcase'], to: '/admin/workspaces' });
  }
  list.push(
    { key: 'blocks', label: t('Content Boxes'), value: blocks.value?.length, loading: loadingBlocks.value, icon: ['fas', 'box'], to: '/admin/blocks' },
    { key: 'plugins', label: t('Plugins'), value: plugins.value?.length, loading: loadingPlugins.value, icon: ['fas', 'puzzle-piece'], to: '/plugins' },
    { key: 'blueprints', label: t('Blueprints'), value: blueprints.value?.length, loading: loadingBlueprints.value, icon: ['fas', 'database'], to: '/no-code/blueprints' },
  );
  for (const status of blueprintStatusCards.value) {
    list.push({ key: status.identifier, label: status.name, value: status.loading ? undefined : status.count, loading: status.loading, icon: ['fas', 'table-list'], removable: true });
  }
  return list;
});

const addableBlueprints = computed(() => availableBlueprints.value.map((b) => ({ identifier: b.identifier, name: b.name })));

// the chart follows the theme: series use the brand colours and text uses the theme text colours
const cssVar = (name: string, fallback: string) =>
  typeof document === 'undefined' ? fallback : getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

const themed = ref(0);
watch(() => [activityChartOption.value, activityTimeframe.value], () => themed.value++);
const themedChart = computed(() => {
  void themed.value;
  const option: any = activityChartOption.value;
  if (!option) return null;
  const text = cssVar('--el-text-color-secondary', '#666');
  const grid = cssVar('--el-border-color-lighter', '#eee');
  const colors = [cssVar('--el-color-primary', '#409eff'), cssVar('--el-color-success', '#67c23a'), cssVar('--el-color-warning', '#e6a23c')];
  return {
    ...option,
    color: colors,
    textStyle: { color: text },
    legend: { ...option.legend, bottom: 0, textStyle: { color: text } },
    grid: { left: '2%', right: '3%', top: 16, bottom: 36, containLabel: true },
    xAxis: option.xAxis.map((axis: any) => ({ ...axis, axisLine: { lineStyle: { color: grid } }, axisLabel: { color: text } })),
    yAxis: option.yAxis.map((axis: any) => ({ ...axis, name: undefined, minInterval: 1, min: 0, splitLine: { lineStyle: { color: grid } }, axisLabel: { color: text } })),
    series: option.series.map((serie: any, index: number) => ({
      ...serie,
      lineStyle: { width: 2.5, color: colors[index % colors.length] },
      itemStyle: { color: colors[index % colors.length] },
      showSymbol: false,
    })),
  };
});
</script>
<style scoped lang="scss">
.home {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px 32px;
}

.two-col {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  align-items: start;
  gap: 16px;
}

.card {
  min-inline-size: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
}

.chart {
  padding: 14px 16px 8px;
}

.chart-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;

  h2 {
    margin: 0;
    font-size: 1rem;
  }
}

@media (max-width: 1023px) {
  .two-col {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 639px) {
  .home {
    gap: 12px;
    padding: 12px 12px 24px;
  }
}
</style>
