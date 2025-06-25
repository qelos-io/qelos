<template>
  <div class="dashboard flex-container">
    <el-tabs model-value="dashboard">
      <el-tab-pane name="dashboard" :label="$t('Dashboard')">
        <div class="dashboard-overview">
          <!-- System Status Overview -->
          <div class="status-overview">
            <h2 class="section-title">{{ $t('System Status') }}</h2>
            <el-row :gutter="20">
              <el-col :xs="24" :sm="12" :md="8" :lg="6" v-for="(status, index) in systemStatus" :key="index" class="status-col">
                <el-card shadow="hover" class="status-card" :class="status.status">
                  <div class="status-icon">
                    <font-awesome-icon :icon="status.icon" size="2x" />
                  </div>
                  <div class="status-info">
                    <h3>{{ status.name }}</h3>
                    <div class="status-badge">{{ status.status }}</div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <!-- Key Metrics -->
          <div class="metrics-grid">
            <StatsCard v-if="!loadingBlocks"
                      color="cyan"
                      :value="blocks.length"
                      title="Total Content Boxes"
                      actionText="View Content Boxes"
                      actionRoute="/blocks"
                      icon="box"
            />
            <StatsCard v-if="!loadingStats"
                      color="blue"
                      :value="stats.users"
                      title="Total Users"
                      actionText="View Users"
                      actionRoute="/users"
                      :fa-icon="['fas', 'users']"
            />
            <StatsCard v-if="!loadingStats"
                      :value="stats.workspaces"
                      color="purple"
                      title="Total Workspaces"
                      actionText="View Workspaces"
                      actionRoute="/admin/workspaces"
                      :fa-icon="['fas', 'briefcase']"
            />
            <StatsCard v-if="!loadingPlugins"
                      :value="plugins.length"
                      color="green"
                      title="Active Plugins"
                      actionText="Manage Plugins"
                      actionRoute="/plugins"
                      :fa-icon="['fas', 'puzzle-piece']"
            />
          </div>

          <!-- Activity Chart -->
          <BlockItem class="chart-container">
            <template v-slot:title>
              {{ $t('System Activity') }}
            </template>
            <div class="chart-filters">
              <el-radio-group v-model="activityTimeframe" size="small">
                <el-radio-button label="day">{{ $t('24h') }}</el-radio-button>
                <el-radio-button label="week">{{ $t('Week') }}</el-radio-button>
                <el-radio-button label="month">{{ $t('Month') }}</el-radio-button>
              </el-radio-group>
            </div>
            <VChart v-if="activityChartOption" :option="activityChartOption" autoresize />
          </BlockItem>

          <!-- Quick Actions -->
          <BlockItem id="dashboard-quick-actions">
            <template v-slot:title>
              {{ $t('Quick Actions') }}
            </template>
            <el-row :gutter="20" class="quick-actions">
              <el-col :xs="12" :sm="12" :md="8" :lg="8" v-for="(action, index) in quickActions" :key="index" class="action-col">
                <router-link :to="action.route" class="quick-action-link">
                  <el-card shadow="hover" class="quick-action-card">
                    <div class="action-icon">
                      <font-awesome-icon :icon="action.icon" />
                    </div>
                    <div class="action-text">{{ action.text }}</div>
                  </el-card>
                </router-link>
              </el-col>
            </el-row>
          </BlockItem>
        </div>
      </el-tab-pane>

      <el-tab-pane name="metadata" :label="$t('Application Metadata')">
        <div class="metadata-dashboard">
          <!-- Configuration Cards Section -->
          <h2 class="section-title">{{ $t('Application Configuration') }}</h2>
          <div class="config-cards-grid">
            <!-- App Settings Card -->
            <el-card shadow="hover" class="config-card">
              <router-link :to="{name: 'editConfiguration', params: {key: 'app-configuration'}}" class="config-card-link">
                <div class="config-card-icon primary">
                  <font-awesome-icon :icon="['fas', 'gear']" size="lg"/>
                </div>
                <div class="config-card-content">
                  <h3>{{ $t('App Settings') }}</h3>
                  <p class="config-card-description">{{ $t('Configure application name, logo, and general settings') }}</p>
                </div>
                <div class="config-card-action">
                  <el-button type="primary" text>
                    <font-awesome-icon :icon="['fas', 'edit']"/> {{ $t('Edit') }}
                  </el-button>
                </div>
              </router-link>
            </el-card>
            
            <!-- SSR Scripts Card -->
            <el-card shadow="hover" class="config-card">
              <router-link :to="{name: 'editConfiguration', params: {key: 'ssr-scripts'}}" class="config-card-link">
                <div class="config-card-icon info">
                  <font-awesome-icon :icon="['fab', 'html5']" size="lg"/>
                </div>
                <div class="config-card-content">
                  <h3>{{ $t('SSR Scripts') }}</h3>
                  <p class="config-card-description">{{ $t('Manage server-side rendering scripts and HTML templates') }}</p>
                </div>
                <div class="config-card-action">
                  <el-button type="info" text>
                    <font-awesome-icon :icon="['fas', 'edit']"/> {{ $t('Edit') }}
                  </el-button>
                </div>
              </router-link>
            </el-card>
            
            <!-- Workspace Settings Card -->
            <el-card shadow="hover" class="config-card">
              <router-link :to="{name: 'editConfiguration', params: {key: 'workspace-configuration'}}" class="config-card-link">
                <div class="config-card-icon success">
                  <font-awesome-icon :icon="['far', 'building']" size="lg"/>
                </div>
                <div class="config-card-content">
                  <h3>{{ $t('Workspace Settings') }}</h3>
                  <p class="config-card-description">{{ $t('Configure workspace defaults, permissions and structure') }}</p>
                </div>
                <div class="config-card-action">
                  <el-button type="success" text>
                    <font-awesome-icon :icon="['fas', 'edit']"/> {{ $t('Edit') }}
                  </el-button>
                </div>
              </router-link>
            </el-card>
            
            <!-- Authentication Settings Card -->
            <el-card shadow="hover" class="config-card">
              <router-link :to="{name: 'editConfiguration', params: {key: 'auth-configuration'}}" class="config-card-link">
                <div class="config-card-icon warning">
                  <font-awesome-icon :icon="['fas', 'key']" size="lg"/>
                </div>
                <div class="config-card-content">
                  <h3>{{ $t('Authentication Settings') }}</h3>
                  <p class="config-card-description">{{ $t('Configure authentication methods, providers, and security settings') }}</p>
                </div>
                <div class="config-card-action">
                  <el-button type="warning" text>
                    <font-awesome-icon :icon="['fas', 'edit']"/> {{ $t('Edit') }}
                  </el-button>
                </div>
              </router-link>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane name="colors" :label="$t('Color Palette & Design')">
        <div class="design-palettes">
          <div v-for="(p, index) in PALETTES" :key="index" @click="applyDesignPalette(p)" class="design-palette-card" :class="{ 'active': isActivePalette(p) }">
            <div class="palette-header">
              <h3>{{ p.name }}</h3>
              <p class="palette-description">{{ p.description }}</p>
            </div>
            <div class="palette-preview">
              <div class="color-swatches">
                <div v-for="color in p.colors" :key="color" class="color-swatch" :style="{backgroundColor: color}"></div>
              </div>
              <div class="design-preview" :style="getPreviewStyles(p.palette)">
                <div class="preview-header">Header</div>
                <div class="preview-content">
                  <div class="preview-text">Text Sample</div>
                  <div class="preview-button">Button</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <DesignConfiguration v-if="configLoaded"/>
      </el-tab-pane>

      <el-tab-pane name="blueprints" :label="$t('Blueprints')">
        <el-button @click.prevent="$router.push({name: 'createBlueprint'})">
          <font-awesome-icon :icon="['fas', 'plus']"/>
          <span class="pad-start">{{ $t('Create Blueprint') }}</span>
        </el-button>
        <BlueprintsList/>
      </el-tab-pane>
    </el-tabs>
  </div>
 <footer><QuickStartWizard/></footer>
</template>

<script setup lang="ts">
import { ref, toRefs, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBlocksList } from '@/modules/blocks/store/blocks-list';
import { resetConfiguration, useAppConfiguration } from '@/modules/configurations/store/app-configuration';
import configurationsService from '@/services/configurations-service';
import { PALETTES, type DesignPalette } from '@/modules/core/utils/colors-palettes';
import { useConfirmAction } from '@/modules/core/compositions/confirm-action';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import LiveEditColorOpener from '@/modules/layouts/components/live-edit/LiveEditColorOpener.vue';
import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import DesignConfiguration from '@/modules/configurations/components/DesignConfiguration.vue';
import StatsCard from '@/modules/pre-designed/components/StatsCard.vue';
import { useUsersStats } from '@/modules/users/compositions/users-stats';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import QuickStartWizard from '@/modules/admins/components/QuickStartWizard.vue';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useAdminWorkspacesList } from '@/modules/workspaces/store/admin-workspaces-list';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import VChart from '@/modules/pre-designed/components/VChart.vue';
import eventsService from '@/services/events-service';
import { useAdminEvents } from '@/modules/core/store/admin-events';

const { appConfig, loaded: configLoaded } = useAppConfiguration();
const { loading: loadingBlocks, blocks } = toRefs(useBlocksList());
const { loading: loadingStats, stats } = useUsersStats();
const { systemStatus, activityChartOption, activityTimeframe } = toRefs(useAdminEvents());
const { t } = useI18n();

// Load plugins data
const pluginsStore = usePluginsList();
const { loading: loadingPlugins, plugins } = toRefs(pluginsStore);

// Load blueprints data
const blueprintsStore = useBlueprintsStore();
const { loading: loadingBlueprints, blueprints } = toRefs(blueprintsStore);

// Quick actions
const quickActions = ref([
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
    route: '/blocks'
  }
]);

const changePalette = useConfirmAction(async function changePalette(colorsPalette) {
  await configurationsService.update('app-configuration', {
    metadata: {
      ...appConfig.value,
      colorsPalette
    }
  })
  await resetConfiguration();
});

// Apply a complete design palette including typography, spacing, etc.
const applyDesignPalette = useConfirmAction(async function applyDesignPalette(designPalette: DesignPalette) {
  const { palette } = designPalette;
  const updatedConfig = {
    ...appConfig.value,
    colorsPalette: palette,
    borderRadius: palette.borderRadius || appConfig.value.borderRadius || 4,
    buttonRadius: palette.buttonRadius || palette.borderRadius || appConfig.value.borderRadius || 4,
    baseFontSize: palette.baseFontSize || appConfig.value.baseFontSize || 16,
    fontFamily: palette.fontFamily || appConfig.value.fontFamily,
    headingsFontFamily: palette.headingsFontFamily || palette.fontFamily || appConfig.value.fontFamily,
    spacing: palette.spacing || appConfig.value.spacing || 'normal',
    shadowStyle: palette.shadowStyle || appConfig.value.shadowStyle || 'light',
    animationSpeed: palette.animationSpeed || appConfig.value.animationSpeed || 300
  };
  
  await configurationsService.update('app-configuration', {
    metadata: updatedConfig
  });
  
  await resetConfiguration();
});

// Check if a palette is currently active
function isActivePalette(designPalette: DesignPalette): boolean {
  if (!appConfig.value.colorsPalette) return false;
  
  // Compare main color and a few other key properties to determine if this palette is active
  return appConfig.value.colorsPalette.mainColor === designPalette.palette.mainColor &&
         appConfig.value.colorsPalette.bgColor === designPalette.palette.bgColor;
}

// Generate preview styles for a palette
function getPreviewStyles(palette: DesignPalette['palette']) {
  return {
    fontFamily: palette.fontFamily || 'inherit',
    '--preview-main-color': palette.mainColor,
    '--preview-bg-color': palette.bgColor,
    '--preview-text-color': palette.textColor,
    '--preview-border-radius': `${palette.borderRadius || 4}px`,
    '--preview-button-radius': `${palette.buttonRadius || palette.borderRadius || 4}px`,
    '--preview-border-color': palette.bordersColor
  };
}
</script>
<style scoped lang="scss">
.blocks-list {
  display: flex;
  flex-wrap: wrap;
}

/* Metadata Dashboard Styles */
.metadata-dashboard {
  padding: 0 20px 30px;
}

/* Configuration Cards Grid */
.config-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.config-card {
  height: 100%;
  transition: all 0.3s ease;
}

.config-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.config-card-link {
  display: flex;
  flex-direction: column;
  height: 100%;
  text-decoration: none;
  color: inherit;
}

.config-card-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  color: white;
}

.config-card-icon.primary {
  background-color: var(--el-color-primary);
}

.config-card-icon.info {
  background-color: var(--el-color-info);
}

.config-card-icon.success {
  background-color: var(--el-color-success);
}

.config-card-icon.warning {
  background-color: var(--el-color-warning);
}

.config-card-content {
  flex: 1;
}

.config-card-content h3 {
  margin: 0 0 8px;
  padding: 0;
  font-size: 18px;
  font-weight: 500;
}

.config-card-description {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  margin: 0 0 15px;
}

.config-card-action {
  margin-top: auto;
  text-align: right;
}

@media screen and (max-width: 768px) {
  .config-cards-grid {
    grid-template-columns: 1fr;
  }
  
  .ui-preview-content {
    flex-direction: column;
  }
}

.dashboard {
  padding-block-end: 50px;
}

/* Dashboard Overview Styles */
.dashboard-overview {
  padding: 0 1%;
}

.section-title {
  margin: 20px 0;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-color);
}

/* System Status Cards */
.status-overview {
  margin-bottom: 30px;
}

.status-card {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 15px;
  transition: all 0.3s ease;
  border-radius: var(--border-radius);
}

.status-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
}

.status-card.operational {
  border-left: 4px solid #67c23a;
}

.status-card.degraded {
  border-left: 4px solid #e6a23c;
}

.status-card.outage {
  border-left: 4px solid #f56c6c;
}

.status-icon {
  margin-right: 15px;
  color: #909399;
}

.status-info {
  flex: 1;
}

.status-info h3 {
  margin: 0 0 5px;
  padding: 0;
  font-size: 16px;
  font-weight: 500;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}

.operational .status-badge {
  background-color: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.degraded .status-badge {
  background-color: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.outage .status-badge {
  background-color: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

/* Metrics Grid */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

/* Chart Container */
.chart-container {
  margin-bottom: 30px;
}

.chart-filters {
  margin-bottom: 15px;
  display: flex;
  justify-content: flex-end;
}

/* Quick Actions */
.quick-actions {
  margin-top: 10px;
  margin-bottom: 30px;
}

.quick-action-link {
  text-decoration: none;
  color: inherit;
}

.quick-action-card {
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.quick-action-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.action-icon {
  font-size: 28px;
  margin-bottom: 15px;
  color: var(--main-color);
}

.action-text {
  font-size: 14px;
  font-weight: 500;
}

/* Design Palettes */
.design-palettes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.design-palette-card {
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.design-palette-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.design-palette-card.active {
  border: 2px solid var(--main-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.palette-header {
  padding: 15px;
  border-bottom: 1px solid var(--border-color);
}

.palette-header h3 {
  margin: 0 0 5px;
  font-size: 16px;
}

.palette-description {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.palette-preview {
  padding: 15px;
}

.color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.design-preview {
  border: 1px solid var(--preview-border-color, #ddd);
  border-radius: var(--preview-border-radius, 4px);
  overflow: hidden;
  height: 120px;
  background-color: var(--preview-bg-color, #fff);
  color: var(--preview-text-color, #333);
}

.preview-header {
  background-color: var(--preview-main-color, #409eff);
  color: #fff;
  padding: 8px 12px;
  font-size: 14px;
}

.preview-content {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-text {
  font-size: 13px;
}

.preview-button {
  background-color: var(--preview-main-color, #409eff);
  color: #fff;
  border-radius: var(--preview-button-radius, 4px);
  padding: 6px 12px;
  font-size: 13px;
  display: inline-block;
  text-align: center;
  width: fit-content;
}

.container {
  margin-inline: 2%;
}

@media screen and (min-width: 1200px) {
  .blocks-list {
    padding: 0 1%;
  }
}

.blocks-list i {
  font-size: var(--large-font-size);
}

.blocks-list > * {
  width: 28%;
  margin: 2%;
}

@media screen and (max-width: 1200px) {
  .blocks-list {
    flex-direction: column;

    > * {
      width: 96%;
    }
  }
  
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions .el-col {
    width: 100%;
    margin-bottom: 15px;
  }
  
  .status-info h3 {
    font-size: 14px;
  }
  
  .status-badge {
    font-size: 11px;
  }
  
  .status-icon {
    margin-right: 10px;
  }
  
  .status-col {
    margin-bottom: 20px;
  }
  
  .action-col {
    margin-bottom: 15px;
  }
}

h3 {
  padding: 10px;
  font-size: 130%;
  font-weight: normal;
}

h3 > * {
  vertical-align: middle;
}

.content {
  padding: 20px;
}

.colors-lines {
  width: 100%;
}

.palette {
  height: 50px;
  display: flex;
  flex-direction: row;
  cursor: pointer;
  border: 1px solid var(--border-color);

  > div {
    flex: 1;
  }
}

.item p {
  position: relative;
}

footer {
  position: fixed;
  bottom: 0;
  width: 100%;
  background-color: var(--body-bg);
  padding: 10px;
  border-top: 1px solid var(--border-color);
}
</style>
