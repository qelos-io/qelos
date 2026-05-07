<template>
  <div class="dashboard-overview">
    <OpenAiAlert v-if="!groupedSources.openai?.length" />

    <!-- 1. Entity data overview -->
    <section class="dash-section">
      <div class="section-head">
        <h2 class="section-title section-title-left">{{ $t('Entity data') }}</h2>
        <p class="section-sub">{{ $t('Document counts and recent blueprint entity activity') }}</p>
      </div>

      <div class="metrics-section inner-metrics">
        <div class="metrics-header">
          <span />
          <div class="blueprint-selector" v-if="availableBlueprints.length">
            <el-popover
              placement="bottom-end"
              :width="380"
              trigger="click"
              v-model:visible="selectorPopoverVisible"
            >
              <template #reference>
                <el-button
                  type="primary"
                  :icon="Plus"
                  circle
                  class="add-blueprint-btn"
                  :disabled="availableBlueprints.length === 0"
                />
              </template>
              <div class="popover-content">
                <div class="popover-header">
                  <h4>{{ $t('Add Blueprint to Dashboard') }}</h4>
                  <p>{{ $t('Track document counts for your blueprints') }}</p>
                </div>
                <el-select
                  v-model="selectedBlueprintToAdd"
                  :placeholder="$t('Choose a blueprint to track...')"
                  clearable
                  filterable
                  @change="addBlueprintToDashboard"
                  class="blueprint-select-popover"
                  size="default"
                  :loading="loadingBlueprints"
                  style="width: 100%"
                >
                  <template #prefix>
                    <font-awesome-icon :icon="['fas', 'search']" class="select-prefix-icon" />
                  </template>
                  <el-option
                    v-for="blueprint in availableBlueprints"
                    :key="blueprint.identifier"
                    :label="blueprint.name"
                    :value="blueprint.identifier"
                    class="blueprint-option"
                  >
                    <div class="option-content">
                      <div class="option-text">
                        <span class="option-name">{{ blueprint.name }}</span>
                      </div>
                    </div>
                  </el-option>
                  <template #empty>
                    <div class="empty-state">
                      <font-awesome-icon :icon="['fas', 'check-circle']" class="empty-icon" />
                      <span>{{ $t('All blueprints are already added') }}</span>
                    </div>
                  </template>
                </el-select>
              </div>
            </el-popover>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="unified-card" v-if="!loadingBlocks">
            <StatsCard
              color="cyan"
              :value="blocks?.length"
              title="Total Content Boxes"
              actionText="View Content Boxes"
              actionRoute="/blocks"
              icon="box"
            />
          </div>
          <div class="unified-card" v-if="!loadingStats">
            <StatsCard
              color="blue"
              :value="stats.users"
              title="Total Users"
              actionText="View Users"
              actionRoute="/users"
              :fa-icon="['fas', 'users']"
            />
          </div>
          <div class="unified-card" v-if="!loadingStats && wsConfig.isActive">
            <StatsCard
              :value="stats.workspaces"
              color="purple"
              title="Total Workspaces"
              actionText="View Workspaces"
              actionRoute="/admin/workspaces"
              :fa-icon="['fas', 'briefcase']"
            />
          </div>
          <div class="unified-card" v-if="!loadingPlugins">
            <StatsCard
              :value="plugins.length"
              color="green"
              title="Active Plugins"
              actionText="Manage Plugins"
              actionRoute="/plugins"
              :fa-icon="['fas', 'puzzle-piece']"
            />
          </div>

          <div class="unified-card blueprint-metric" v-for="(blueprintStatus, index) in blueprintStatusCards" :key="`blueprint-${index}`">
            <div class="blueprint-card-content">
              <div class="blueprint-header">
                <div class="blueprint-icon">
                  <font-awesome-icon :icon="['fas', 'database']" />
                </div>
                <el-button
                  type="danger"
                  size="small"
                  text
                  @click="removeBlueprintFromDashboard(blueprintStatus.identifier)"
                  class="remove-button"
                >
                  <font-awesome-icon :icon="['fas', 'times']" />
                </el-button>
              </div>
              <div class="blueprint-info">
                <h3>{{ blueprintStatus.name }}</h3>
                <p class="blueprint-description" v-if="blueprintStatus.description">{{ blueprintStatus.description }}</p>
                <div class="blueprint-count">
                  {{ blueprintStatus.loading ? $t('Loading...') : blueprintStatus.count }}
                </div>
                <p class="blueprint-label">{{ $t('Documents') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="unified-card entity-events-card">
        <h3 class="table-card-title">{{ $t('Recent entity activity') }}</h3>
        <el-table v-loading="loadingEntityEvents" :data="entityActivityEvents" stripe empty-text="—" class="compact-table" dir="ltr">
          <el-table-column prop="created" :label="$t('When')" width="160">
            <template #default="{ row }">{{ formatEventTime(row.created) }}</template>
          </el-table-column>
          <el-table-column prop="kind" :label="$t('Blueprint')" min-width="140">
            <template #default="{ row }">{{ blueprintLabel(row.kind) }}</template>
          </el-table-column>
          <el-table-column prop="eventName" :label="$t('Action')" width="120" />
          <el-table-column prop="description" :label="$t('Summary')" min-width="200" show-overflow-tooltip />
        </el-table>
      </div>
    </section>

    <!-- 2. AI activity -->
    <section class="dash-section">
      <div class="section-head">
        <h2 class="section-title section-title-left">{{ $t('AI activity') }}</h2>
        <p class="section-sub">{{ $t('Conversation threads and recorded token usage') }}</p>
      </div>

      <el-row :gutter="16" class="token-row">
        <el-col :xs="24" :sm="12">
          <div class="unified-card token-card">
            <div class="token-label">{{ $t('Tokens (7 days)') }}</div>
            <div class="token-value">{{ formatNum(tokensWeek) }}</div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12">
          <div class="unified-card token-card">
            <div class="token-label">{{ $t('Tokens (24 hours)') }}</div>
            <div class="token-value">{{ formatNum(tokensDay) }}</div>
          </div>
        </el-col>
      </el-row>

      <div class="unified-card threads-card">
        <h3 class="table-card-title">{{ $t('Recent conversations') }}</h3>
        <el-table v-loading="loadingThreads" :data="recentThreads" stripe empty-text="—" class="compact-table" dir="ltr">
          <el-table-column prop="title" :label="$t('Thread')" min-width="180" show-overflow-tooltip />
          <el-table-column prop="updated" :label="$t('Updated')" width="170">
            <template #default="{ row }">{{ formatEventTime(row.updated) }}</template>
          </el-table-column>
          <el-table-column prop="integration" :label="$t('Integration')" width="120" show-overflow-tooltip />
        </el-table>
      </div>
    </section>

    <!-- 3. Recent platform events -->
    <section class="dash-section">
      <div class="section-head">
        <h2 class="section-title section-title-left">{{ $t('Recent platform events') }}</h2>
        <router-link class="section-link" :to="{ name: 'log' }">{{ $t('Events log') }}</router-link>
      </div>
      <div class="unified-card">
        <el-table v-loading="loadingRecentEvents" :data="recentPlatformEvents" stripe empty-text="—" class="compact-table" dir="ltr">
          <el-table-column prop="created" :label="$t('When')" width="160">
            <template #default="{ row }">{{ formatEventTime(row.created) }}</template>
          </el-table-column>
          <el-table-column prop="source" :label="$t('Source')" width="120" show-overflow-tooltip />
          <el-table-column prop="kind" :label="$t('Kind')" width="120" show-overflow-tooltip />
          <el-table-column prop="eventName" :label="$t('Event')" width="140" show-overflow-tooltip />
          <el-table-column prop="description" :label="$t('Description')" min-width="200" show-overflow-tooltip />
        </el-table>
      </div>
    </section>

    <!-- 4. Quick actions -->
    <section class="dash-section">
      <div class="section-head">
        <h2 class="section-title section-title-left">{{ $t('Quick actions') }}</h2>
      </div>
      <div class="quick-actions-grid">
        <router-link v-for="(action, index) in quickActions" :key="index" :to="action.route" class="quick-action-link">
          <div class="quick-action-card">
            <div class="action-icon-container">
              <div class="action-icon">
                <font-awesome-icon :icon="action.icon" />
              </div>
            </div>
            <div class="action-content">
              <h3 class="action-title">{{ action.text }}</h3>
              <div class="action-arrow">
                <font-awesome-icon :icon="['fas', 'arrow-right']" />
              </div>
            </div>
          </div>
        </router-link>
      </div>
    </section>

    <!-- 5. API & platform health (from platform event throughput — gateway traffic is reflected in the events stream) -->
    <section class="dash-section">
      <div class="section-head">
        <h2 class="section-title section-title-left">{{ $t('API & platform health') }}</h2>
        <p class="section-sub">
          {{ $t('Signals derived from platform events (last 24 hours), including provider and auth failures.') }}
        </p>
      </div>
      <el-row :gutter="16">
        <el-col :xs="24" :sm="8">
          <div class="unified-card health-card" v-loading="loadingHealth">
            <div class="health-label">{{ $t('Platform events (24h)') }}</div>
            <div class="health-value">{{ formatNum(throughput24h) }}</div>
            <p class="health-hint">{{ $t('Total recorded events — correlates with API and subsystem activity') }}</p>
          </div>
        </el-col>
        <el-col :xs="24" :sm="8">
          <div class="unified-card health-card" v-loading="loadingHealth">
            <div class="health-label">{{ $t('Error signals (24h)') }}</div>
            <div class="health-value">{{ formatNum(errorSignals24h) }}</div>
            <p class="health-hint">{{ $t('AI provider failures and failed social logins') }}</p>
          </div>
        </el-col>
        <el-col :xs="24" :sm="8">
          <div class="unified-card health-card" v-loading="loadingHealth">
            <div class="health-label">{{ $t('Error rate (estimate)') }}</div>
            <div class="health-value">{{ errorRateDisplay }}</div>
            <p class="health-hint">{{ $t('Error signals divided by platform events in the same window') }}</p>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- Trends: signups & workspace activity -->
    <section class="dash-section">
      <div class="section-head">
        <h2 class="section-title section-title-left">{{ $t('Signups & workspace activity') }}</h2>
      </div>
      <div class="chart-container">
        <div class="unified-card" v-if="activityChartOption">
          <VChart :option="activityChartOption" autoresize />
        </div>
        <div class="chart-filters">
          <el-radio-group v-model="activityTimeframe" size="small">
            <el-radio-button label="day">{{ $t('24h') }}</el-radio-button>
            <el-radio-button label="week">{{ $t('Week') }}</el-radio-button>
            <el-radio-button label="month">{{ $t('Month') }}</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, toRefs, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBlocksList } from '@/modules/blocks/store/blocks-list';
import StatsCard from '@/modules/pre-designed/components/StatsCard.vue';
import { useUsersStats } from '@/modules/users/compositions/users-stats';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import VChart from '@/modules/pre-designed/components/VChart.vue';
import { useAdminEvents } from '@/modules/core/store/admin-events';
import { authStore } from '@/modules/core/store/auth';
import { api } from '@/services/apis/api';
import { useUserMetadataStore } from '@/modules/core/store/user-metadata';
import OpenAiAlert from '@/modules/core/components/forms/OpenAiAlert.vue';
import { Plus } from '@element-plus/icons-vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import sdk from '@/services/sdk';
import eventsService, { type IEvent } from '@/services/apis/events-service';
import type { IThread } from '@qelos/sdk/ai';

const { loading: loadingBlocks, blocks } = toRefs(useBlocksList());
const { loading: loadingStats, stats } = useUsersStats();
const { activityChartOption, activityTimeframe } = toRefs(useAdminEvents());
const { t } = useI18n();

const wsConfig = useWsConfiguration();
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

const selectedBlueprintToAdd = ref('');
const blueprintCounts = ref<Record<string, { loading: boolean; count: number }>>({});
const userMetadataStore = useUserMetadataStore();
const selectorPopoverVisible = ref(false);

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

function formatNum(n: number) {
  if (n === undefined || n === null || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function formatEventTime(value: Date | string | undefined) {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

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
    selectedBlueprintToAdd.value = '';
    selectorPopoverVisible.value = false;

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
</script>

<style scoped lang="scss">
.dashboard-overview {
  padding: 0 20px 30px;
}

.dash-section {
  margin-bottom: 36px;
}

.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.section-title-left {
  text-align: start;
  width: 100%;
}

.section-sub {
  margin: 4px 0 0;
  width: 100%;
  font-size: 14px;
  color: #64748b;
}

.section-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--main-color);
}

.inner-metrics {
  margin-bottom: 20px;
}

.entity-events-card,
.threads-card {
  padding: 16px 20px 20px;
}

.table-card-title {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.compact-table {
  width: 100%;
}

.token-row {
  margin-bottom: 16px;
}

.token-card {
  padding: 20px;
}

.token-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.token-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--main-color);
}

.health-card {
  padding: 20px;
  min-height: 140px;
}

.health-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.health-value {
  font-size: 26px;
  font-weight: 700;
  color: #2c3e50;
}

.health-hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
}

.metrics-section {
  margin-bottom: 24px;
}

.metrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.blueprint-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-blueprint-btn {
  width: 36px !important;
  height: 36px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, var(--main-color), #667eea) !important;
  border: none !important;
  color: white !important;
  font-size: 16px !important;
  transition: all 0.3s ease;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(var(--main-color-rgb), 0.3);
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.add-blueprint-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(var(--main-color-rgb), 0.4);
  background: linear-gradient(135deg, var(--main-color), #667eea) !important;
}

.add-blueprint-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.popover-content {
  padding: 0;
}

.popover-header {
  padding: 20px 20px 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.popover-header h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.popover-header p {
  margin: 0;
  font-size: 13px;
  color: #666;
}

.blueprint-select-popover {
  margin: 16px 20px 20px 20px;
  width: calc(100% - 40px) !important;
}

.blueprint-select-popover .el-input__wrapper {
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.blueprint-select-popover .el-input__wrapper:hover {
  border-color: rgba(var(--main-color-rgb), 0.3);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
}

.blueprint-select-popover .el-input__wrapper.is-focus {
  border-color: var(--main-color);
  box-shadow: 0 0 0 1px rgba(var(--main-color-rgb), 0.2);
}

.select-prefix-icon {
  font-size: 14px;
  color: #999;
  margin-right: 4px;
}

.blueprint-option {
  padding: 0 !important;
}

.blueprint-option .el-select-dropdown__item {
  padding: 0 !important;
  border-bottom: 1px solid #f0f0f0;
  height: auto !important;
  line-height: normal !important;
}

.blueprint-option:last-child .el-select-dropdown__item {
  border-bottom: none;
}

.option-content {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-height: 44px;
  padding: 12px 16px;
}

.option-text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  flex: 1;
  width: 100%;
}

.option-name {
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
  line-height: 1.3;
  margin: 0;
  padding: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: #666;
  font-size: 14px;
  font-style: italic;
}

.empty-icon {
  font-size: 16px;
  color: #28a745;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  width: 100%;
  max-width: 1400px;
  margin: 20px auto 30px auto;
  gap: 24px;
}

@media (min-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(3, 1fr);
    max-width: 900px;
  }
}

.blueprint-metric .blueprint-card-content {
  padding: 20px;
}

.blueprint-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.blueprint-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--main-color), #667eea);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.remove-button {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.blueprint-metric:hover .remove-button {
  opacity: 1;
}

.blueprint-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.blueprint-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #666;
}

.blueprint-count {
  font-size: 24px;
  font-weight: 700;
  color: var(--main-color);
  margin-bottom: 4px;
}

.blueprint-label {
  margin: 0;
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chart-container {
  margin: 20px auto 30px auto;
  max-width: 1200px;
}

.chart-filters {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
  padding: 0 4px;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  max-width: 1200px;
  margin: 20px auto 0 auto;
}

@media (min-width: 1200px) {
  .quick-actions-grid {
    grid-template-columns: repeat(3, 1fr);
    max-width: 900px;
  }
}

.quick-action-link {
  text-decoration: none;
  color: inherit;
}

.quick-action-card {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  height: 180px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  cursor: pointer;
}

.quick-action-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--main-color), #667eea);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.quick-action-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  border-color: rgba(var(--main-color-rgb), 0.2);
}

.quick-action-card:hover::before {
  opacity: 1;
}

.action-icon-container {
  margin-bottom: 20px;
}

.action-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--main-color), #667eea);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  transition: transform 0.3s ease;
}

.quick-action-card:hover .action-icon {
  transform: scale(1.1);
}

.action-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.action-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.action-arrow {
  color: var(--main-color);
  font-size: 16px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s ease;
}

.quick-action-card:hover .action-arrow {
  opacity: 1;
  transform: translateX(0);
}

.unified-card {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  min-width: 240px;
}

.unified-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--main-color), #667eea);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.unified-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  border-color: rgba(var(--main-color-rgb), 0.2);
}

.unified-card:hover::before {
  opacity: 1;
}

@media (max-width: 768px) {
  .metrics-grid,
  .quick-actions-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .chart-container {
    margin: 16px auto 24px auto;
  }

  .unified-card {
    margin-bottom: 16px;
  }

  .quick-action-card {
    height: 160px;
    padding: 24px 20px;
  }

  .action-icon {
    width: 48px;
    height: 48px;
    font-size: 20px;
  }

  .action-title {
    font-size: 15px;
  }

  .metrics-header {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .section-title {
    text-align: left;
    font-size: 20px;
    margin: 0;
  }

  .blueprint-selector {
    flex-shrink: 0;
  }
}

@media (max-width: 480px) {
  .quick-actions-grid,
  .metrics-grid {
    gap: 12px;
  }

  .quick-action-card {
    height: 140px;
    padding: 20px 16px;
  }

  .action-icon {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }

  .action-title {
    font-size: 14px;
  }

  .dashboard-overview {
    padding: 0 12px 20px;
  }
}

.el-popover {
  padding: 0;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.el-popover .el-popover__title {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
}

.el-popover .el-popover__content {
  padding: 20px;
}

.el-popover .el-select {
  width: 100%;
}

.el-popover .el-select .el-input__wrapper {
  padding: 0;
  border: none;
  border-radius: 0;
  background-color: transparent;
  box-shadow: none;
}

.el-popover .el-select .el-input__wrapper .el-input__inner {
  padding: 0 12px;
  border: none;
  border-radius: 0;
  background-color: transparent;
  box-shadow: none;
}

.el-popover .el-select .el-input__wrapper .el-input__inner:hover {
  background-color: #f0f0f0;
}

.el-popover .el-select .el-input__wrapper .el-input__inner:focus {
  background-color: #f9f9f9;
  box-shadow: 0 0 0 2px rgba(var(--main-color-rgb), 0.2);
}
</style>
