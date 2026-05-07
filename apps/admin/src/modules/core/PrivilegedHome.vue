<template>
  <div class="dashboard flex-container">
    <el-tabs :model-value="activeTab" @update:model-value="activeTab = $event.toString()" class="dashboard-tabs">
      <el-tab-pane name="dashboard" :label="$t('Dashboard')">
        <DashboardOverview />
      </el-tab-pane>

      <el-tab-pane name="blueprints" :label="$t('Blueprints')">
        <BlueprintsList/>
      </el-tab-pane>

      <el-tab-pane name="plugins" :label="$t('Plugins')">
        <YourPluginsList/>
      </el-tab-pane>

      <el-tab-pane name="integrations" :label="$t('Integrations')">
        <WorkflowsView />

        <IntegrationFormModal :visible="$route.query.mode === 'create' || ($route.query.mode === 'edit' && !!editingIntegration)"
          :editing-integration="editingIntegration"
          @close="closeIntegrationFormModal" />
      </el-tab-pane>

      <el-tab-pane name="metadata" :label="$t('Settings')">
        <div class="metadata-dashboard">
          <!-- Configuration Cards Section -->
          <h2 class="section-title">{{ $t('Application configuration') }}</h2>
          <div class="config-cards-grid">
            <!-- Appearance -->
            <div class="unified-card">
              <router-link :to="{ name: 'appearance' }" class="config-card-link">
                <div class="config-card-icon primary">
                  <font-awesome-icon :icon="['fas', 'palette']" size="lg"/>
                </div>
                <div class="config-card-content">
                  <h3>{{ $t('Appearance') }}</h3>
                  <p class="config-card-description">{{ $t('Themes, colors, typography, and design tokens') }}</p>
                </div>
                <div class="config-card-action">
                  <el-button type="primary" text>
                    <font-awesome-icon :icon="['fas', 'edit']"/>
                    {{ $t('Edit') }}
                  </el-button>
                </div>
              </router-link>
            </div>

            <!-- App Settings Card -->
            <div class="unified-card">
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
                    <font-awesome-icon :icon="['fas', 'edit']"/>
                    {{ $t('Edit') }}
                  </el-button>
                </div>
              </router-link>
            </div>

            <!-- SSR Scripts Card -->
            <div class="unified-card">
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
            </div>

            <!-- Workspace Settings Card -->
            <div class="unified-card">
              <router-link :to="{name: 'editConfiguration', params: {key: 'workspace-configuration'}}" class="config-card-link">
                <div class="config-card-icon" :class="wsConfig.isActive ? 'success' : 'info'">
                  <font-awesome-icon :icon="['far', 'building']" size="lg"/>
                </div>
                <div class="config-card-content">
                  <div class="title-with-status">
                    <h3>{{ $t('Workspace Settings') }}</h3>
                    <el-tag size="small" :type="wsConfig.isActive ? 'success' : 'info'" effect="light" class="status-tag">
                      {{ wsConfig.isActive ? $t('Active') : $t('Inactive') }}
                    </el-tag>
                  </div>
                  <p class="config-card-description">{{ $t('Configure workspace defaults, permissions and structure') }}</p>
                </div>
                <div class="config-card-action">
                  <el-button :type="wsConfig.isActive ? 'success' : 'info'" text>
                    <font-awesome-icon :icon="['fas', 'edit']"/> {{ $t('Edit') }}
                  </el-button>
                </div>
              </router-link>
            </div>

            <!-- Payments Configuration Card -->
            <div class="unified-card">
              <router-link :to="{name: 'paymentsConfiguration'}" class="config-card-link">
                <div class="config-card-icon primary">
                  <font-awesome-icon :icon="['fas', 'tags']" size="lg"/>
                </div>
                <div class="config-card-content">
                  <h3>{{ $t('Payments & Plans') }}</h3>
                  <p class="config-card-description">{{ $t('Configure pricing plans, coupons, and payment providers') }}</p>
                </div>
                <div class="config-card-action">
                  <el-button type="primary" text>
                    <font-awesome-icon :icon="['fas', 'edit']"/>
                    {{ $t('Configure') }}
                  </el-button>
                </div>
              </router-link>
            </div>

            <!-- Authentication Settings Card -->
            <div class="unified-card">
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
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
 <footer><QuickStartWizard/></footer>
</template>

<script setup lang="ts">

import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import YourPluginsList from '@/modules/plugins/components/YourPluginsList.vue';
import QuickStartWizard from '@/modules/admins/components/QuickStartWizard.vue';
import DashboardOverview from '@/modules/core/components/DashboardOverview.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import WorkflowsView from '../integrations/components/WorkflowsView.vue';
import IntegrationFormModal from '../integrations/components/IntegrationFormModal.vue';
import { useRoute, useRouter } from 'vue-router';
import { useIntegrationsStore } from '../integrations/store/integrations';
import { computed } from 'vue';

const wsConfig = useWsConfiguration();

const route = useRoute();
const integrationsStore = useIntegrationsStore();
const router = useRouter();

const activeTab = computed({
  get: () => {
  return route.query.tab?.toString() || 'dashboard';
  },
  set: (tab) => {
    router.push({ query: { ...route.query, tab } });
  }
});

const closeIntegrationFormModal = () => {
  integrationsStore.retry();
  router.push({ query: { ...route.query, mode: undefined, id: undefined } });
}

const editingIntegration = computed(() => {
  if (route.query.mode === 'create') return undefined;
  if (route.query.mode === 'edit' && route.query.id) {
    return integrationsStore.integrations?.find(integration => integration._id === route.query.id);
  }
  return undefined;
})
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

/* Unified Card System */
.unified-card {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
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

/* Metrics Grid - Updated to use unified cards */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  max-width: 1200px;
  margin: 20px auto 30px auto;
  gap: 24px;
}

@media (min-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(3, 1fr);
    max-width: 900px;
  }
}

/* Chart Container - Updated styling */
.chart-container {
  margin: 20px auto 30px auto;
  max-width: 1200px;
}

.chart-container .el-card {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.chart-container .el-card::before {
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

.chart-container .el-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.1);
  border-color: rgba(var(--main-color-rgb), 0.2);
}

.chart-container .el-card:hover::before {
  opacity: 1;
}

.chart-filters {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-end;
  padding: 0 4px;
}

/* Configuration Cards Grid - Updated to match unified design */
.config-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  max-width: 1200px;
  margin: 20px auto 30px auto;
  gap: 24px;
}

@media (min-width: 1200px) {
  .config-cards-grid {
    grid-template-columns: repeat(3, 1fr);
    max-width: 900px;
  }
}

.config-card {
  background: linear-gradient(145deg, #ffffff, #f8f9fa);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  height: 100%;
}

.config-card::before {
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

.config-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
  border-color: rgba(var(--main-color-rgb), 0.2);
}

.config-card:hover::before {
  opacity: 1;
}

.config-card-link {
  display: flex;
  flex-direction: column;
  height: 100%;
  text-decoration: none;
  color: inherit;
  padding: 24px;
}

.config-card-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  color: white;
  transition: all 0.3s ease;
}

.config-card:hover .config-card-icon {
  transform: scale(1.1);
}

.config-card-icon.primary {
  background: linear-gradient(135deg, var(--el-color-primary), #667eea);
  box-shadow: 0 4px 16px rgba(var(--el-color-primary-rgb), 0.3);
}

.config-card-icon.info {
  background: linear-gradient(135deg, var(--el-color-info), #36cfc9);
  box-shadow: 0 4px 16px rgba(var(--el-color-info-rgb), 0.3);
}

.config-card-icon.success {
  background: linear-gradient(135deg, var(--el-color-success), #73d13d);
  box-shadow: 0 4px 16px rgba(var(--el-color-success-rgb), 0.3);
}

.config-card-icon.warning {
  background: linear-gradient(135deg, var(--el-color-warning), #ffc53d);
  box-shadow: 0 4px 16px rgba(var(--el-color-warning-rgb), 0.3);
}

.config-card:hover .config-card-icon.primary {
  box-shadow: 0 6px 20px rgba(var(--el-color-primary-rgb), 0.4);
}

.config-card:hover .config-card-icon.info {
  box-shadow: 0 6px 20px rgba(var(--el-color-info-rgb), 0.4);
}

.config-card:hover .config-card-icon.success {
  box-shadow: 0 6px 20px rgba(var(--el-color-success-rgb), 0.4);
}

.config-card:hover .config-card-icon.warning {
  box-shadow: 0 6px 20px rgba(var(--el-color-warning-rgb), 0.4);
}

.config-card-content {
  flex: 1;
}

.title-with-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.title-with-status h3 {
  margin: 0;
}

.status-tag {
  margin-inline-start: 10px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-radius: 12px;
  padding: 0 10px;
  height: 24px;
  line-height: 22px;
  transition: all 0.3s ease;
}

.config-card-description {
  color: #718096;
  font-size: 14px;
  margin: 0 0 20px;
  line-height: 1.5;
}

.config-card-action {
  margin-top: auto;
  text-align: right;
}

.config-card-action .el-button {
  opacity: 1; /* Always visible */
  transition: transform 0.3s ease;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.config-card:hover .config-card-action .el-button {
  transform: translateX(4px); /* Slight movement on hover for better UX */
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

.dashboard {
  padding-block-end: 50px;
}

.container {
  margin-inline: 2%;
}

.dashboard-tabs {
  :deep(.el-tabs__header) {
    inset-block-start: 0;
    background-color: var(--body-bg);
    z-index: 2;
  }

  :deep(.el-tabs__nav-wrap) {
    transition: box-shadow 0.2s ease;
  }

  @media (max-width: 768px) {
    :deep(.el-tabs__header) {
      position: sticky;
      padding-inline: 8px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
    }

    :deep(.el-tabs__nav-wrap) {
      overflow-x: auto;
      overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    :deep(.el-tabs__nav-wrap::-webkit-scrollbar) {
      display: none;
    }

    :deep(.el-tabs__nav-scroll) {
      overflow: visible;
      min-width: max-content;
    }

    :deep(.el-tabs__nav) {
      display: inline-flex;
      min-width: max-content;
      gap: 12px;
      padding-inline: 4px;
    }

    :deep(.el-tabs__item) {
      flex: 0 0 auto;
      white-space: nowrap;
      font-size: 0.9rem;
      padding-inline: 12px;
    }
  }
}
</style>
