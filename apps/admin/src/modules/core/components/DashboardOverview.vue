<template>
  <div class="dashboard-overview">

    <OpenAiAlert v-if="!groupedSources.openai?.length" />

    <!-- System Status Overview -->
    <div class="status-overview">
      <h2 class="section-title">{{ $t('System Status') }}</h2>
      <div class="status-row-container">
        <el-row :gutter="20" justify="center">
          <!-- System Status Cards -->
          <el-col :xs="24" :sm="12" :md="8" :lg="8" v-for="(status, index) in systemStatus" :key="index" class="status-col">
            <div class="unified-card" :class="status.status">
              <div class="status-content">
                <div class="status-icon">
                  <font-awesome-icon :icon="status.icon" size="2x" />
                </div>
                <div class="status-info">
                  <h3>{{ status.name }}</h3>
                  <div class="status-badge">{{ status.status }}</div>
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="metrics-section">
      <div class="metrics-header">
        <h2 class="section-title">{{ $t('Key Metrics') }}</h2>
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
              >
              </el-button>
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
        
        <!-- Blueprint Metrics Cards -->
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

    <!-- Activity Chart -->
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

    <!-- Quick Actions -->
    <div class="quick-actions-grid">
      <router-link 
        v-for="(action, index) in quickActions" 
        :key="index" 
        :to="action.route" 
        class="quick-action-link"
      >
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

const { loading: loadingBlocks, blocks } = toRefs(useBlocksList());
const { loading: loadingStats, stats } = useUsersStats();
const { systemStatus, activityChartOption, activityTimeframe } = toRefs(useAdminEvents());
const { t } = useI18n();

const wsConfig = useWsConfiguration();
const { groupedSources } = toRefs(useIntegrationSourcesStore());

// Load plugins data
const pluginsStore = usePluginsList();
const { loading: loadingPlugins, plugins } = toRefs(pluginsStore);

// Load blueprints data
const blueprintsStore = useBlueprintsStore();
const { loading: loadingBlueprints, blueprints } = toRefs(blueprintsStore);

// Quick actions - defined as array of all possible actions
const allQuickActions = [
  { 
    text: t('Create Blueprint'), 
    icon: ['fas', 'plus-circle'], 
    route: { name: 'createBlueprint' }
  },
  { 
    text: t('Manage Users'), 
    icon: ['fas', 'users-cog'], 
    route: '/users'
  },
  { 
    text: t('App Settings'), 
    icon: ['fas', 'cog'], 
    route: { name: 'editConfiguration', params: { key: 'app-configuration' }}
  },
  { 
    text: t('Manage Workspaces'), 
    icon: ['fas', 'briefcase'], 
    route: '/admin/workspaces'
  },
  { 
    text: t('Manage Plugins'), 
    icon: ['fas', 'puzzle-piece'], 
    route: '/plugins'
  },
  { 
    text: t('View Content Boxes'), 
    icon: ['fas', 'cubes'], 
    route: '/admin/blocks'
  },
  {
    text: t('Manage Integrations'),
    icon: ['fas', 'arrows-turn-to-dots'],
    route: '/integrations'
  }
];

// Computed property that filters out Manage Workspaces when wsConfig.isActive is false
const quickActions = computed(() => {
  return allQuickActions.filter(action => {
    // Filter out Manage Workspaces when wsConfig.isActive is false
    if (action.route === '/admin/workspaces' && !wsConfig.isActive) {
      return false;
    }
    return true;
  });
});

// Blueprint selection functionality
const selectedBlueprintToAdd = ref('');
const blueprintCounts = ref<Record<string, { loading: boolean; count: number }>>({});
const userMetadataStore = useUserMetadataStore();
const selectorPopoverVisible = ref(false);

// Load user's selected blueprints from internal metadata
onMounted(async () => {
  if (authStore.user) {
    await userMetadataStore.promise;
    
    // Load counts for selected blueprints
    for (const identifier of userMetadataStore.selectedDashboardBlueprints) {
      await loadBlueprintCount(identifier);
    }
  }
});

const availableBlueprints = computed(() => {
  return blueprints.value.filter(blueprint => 
    !userMetadataStore.selectedDashboardBlueprints.includes(blueprint.identifier)
  );
});

const blueprintStatusCards = computed(() => {
  return userMetadataStore.selectedDashboardBlueprints.map(identifier => {
    const blueprint = blueprints.value.find(bp => bp.identifier === identifier);
    const countData = blueprintCounts.value[identifier] || { loading: true, count: 0 };
    
    return {
      identifier,
      name: blueprint?.name || identifier,
      description: blueprint?.description || '',
      loading: countData.loading,
      count: countData.count
    };
  });
});

async function loadBlueprintCount(identifier: string) {
  blueprintCounts.value[identifier] = { loading: true, count: 0 };
  
  try {
    const response = await api.get(`/api/blueprints/${identifier}/charts/count`);
    blueprintCounts.value[identifier] = { 
      loading: false, 
      count: response.data.count || 0 
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
    selectorPopoverVisible.value = false; // Close the popover
    
    // Load count for the new blueprint
    await loadBlueprintCount(identifier);
  } catch (error) {
    console.error('Failed to add blueprint to dashboard:', error);
  }
}

async function removeBlueprintFromDashboard(identifier: string) {
  if (!authStore.user) return;
  
  const updatedBlueprints = userMetadataStore.selectedDashboardBlueprints.filter(id => id !== identifier);
  
  try {
    await userMetadataStore.updateSelectedDashboardBlueprints(updatedBlueprints);
    
    // Remove count data
    delete blueprintCounts.value[identifier];
  } catch (error) {
    console.error('Failed to remove blueprint from dashboard:', error);
  }
}
</script>

<style scoped lang="scss">
/* Dashboard Overview Styles */
.dashboard-overview {
  padding: 0 20px 30px;
}

.section-title {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
  text-align: center;
}

/* System Status Styles */
.status-overview {
  margin-bottom: 40px;
}

.status-row-container {
  max-width: 1200px;
  margin: 0 auto;
}

.status-col {
  margin-bottom: 20px;
}

.status-content {
  display: flex;
  align-items: center;
  padding: 20px;
  min-width: 240px;
  gap: 16px;
}

.status-icon {
  color: var(--main-color);
  min-width: 48px;
}

.status-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.unified-card.operational .status-badge {
  background-color: #d4edda;
  color: #155724;
}

.unified-card.degraded .status-badge {
  background-color: #fff3cd;
  color: #856404;
}

.unified-card.outage .status-badge {
  background-color: #f8d7da;
  color: #721c24;
}

/* Metrics Section */
.metrics-section {
  margin-bottom: 40px;
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

/* Metrics Grid - Updated to use unified cards */
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

/* Blueprint Metrics Cards */
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

/* Chart Container - Updated styling */
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

/* Quick Actions Grid */
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

/* Unified Card System */
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

/* Responsive adjustments */
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

  .selector-container {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    min-width: auto;
    padding: 12px;
  }

  .selector-label {
    justify-content: center;
    font-size: 13px;
  }

  .blueprint-select {
    min-width: auto;
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

/* Popover Styles */
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
