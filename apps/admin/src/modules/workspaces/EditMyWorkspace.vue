<template>
  <div class="edit-workspace">
    <!-- Breadcrumb Navigation -->
    <el-breadcrumb class="workspace-breadcrumb" separator="/">
      <el-breadcrumb-item :to="{ name: 'workspaces' }">
        <font-awesome-icon :icon="['fas', 'layer-group']" class="breadcrumb-icon" />
        {{ $t('Workspaces') }}
      </el-breadcrumb-item>
      <el-breadcrumb-item v-if="workspace">
        {{ workspace.name }}
      </el-breadcrumb-item>
    </el-breadcrumb>
    
    <div class="workspace-header" v-if="loaded && workspace">
      <div class="workspace-info">
        <div class="workspace-logo" v-if="workspace.logo">
          <img :src="workspace.logo" :alt="workspace.name" />
        </div>
        <div class="workspace-details">
          <h1>{{ workspace.name }}</h1>
          <p v-if="workspace.members">{{ $t('# Members') }}: {{ workspace.members?.length }}</p>
        </div>
      </div>
    </div>
    <el-skeleton v-else-if="!loaded" :rows="3" animated />

    <el-tabs 
      v-model="activeTab" 
      type="card" 
      class="workspace-tabs"
      @tab-change="handleTabChange"
    > 
      <el-tab-pane 
        :label="$t('General')" 
        name="general"
        :lazy="true"
      >
        <template #label>
          <font-awesome-icon :icon="['fas', 'cog']" class="tab-icon" />
          {{ $t('General') }}
        </template>
      </el-tab-pane>
      
      <el-tab-pane 
        :label="$t('Members')" 
        name="members"
        :lazy="true"
      >
        <template #label>
          <font-awesome-icon :icon="['fas', 'users']" class="tab-icon" />
          {{ $t('Members') }}
        </template>
      </el-tab-pane>
      
      <el-tab-pane 
        v-if="showPaymentsTab"
        :label="$t('Payments')" 
        name="payments"
        :lazy="true"
      >
        <template #label>
          <font-awesome-icon :icon="['fas', 'credit-card']" class="tab-icon" />
          {{ $t('Payments') }}
        </template>
      </el-tab-pane>
      
      <el-tab-pane 
        v-if="showIntegrationsTab"
        :label="$t('Integrations')" 
        name="integrations"
        :lazy="true"
      >
        <template #label>
          <font-awesome-icon :icon="['fas', 'plug']" class="tab-icon" />
          {{ $t('Integrations') }}
        </template>
      </el-tab-pane>
      
      <el-tab-pane 
        v-if="showSecurityTab"
        :label="$t('Security')" 
        name="security"
        :lazy="true"
      >
        <template #label>
          <font-awesome-icon :icon="['fas', 'shield-alt']" class="tab-icon" />
          {{ $t('Security') }}
        </template>
      </el-tab-pane>
      
      <el-tab-pane 
        v-if="showAdvancedTab"
        :label="$t('Advanced')" 
        name="advanced"
        :lazy="true"
      >
        <template #label>
          <font-awesome-icon :icon="['fas', 'cogs']" class="tab-icon" />
          {{ $t('Advanced') }}
        </template>
      </el-tab-pane>
    </el-tabs>

    <div class="tab-content">
      <router-view v-slot="{ Component }">
        <component 
          v-if="workspace && workspace._id"
          :is="Component" 
          :workspace="workspace"
          :workspace-id="workspace._id"
          :ws-config="wsConfig.metadata"
          :submitting="submitting"
          @submitted="handleTabSubmit"
          @refresh-workspace="handleRefreshWorkspace"
        />
        <el-skeleton v-else :rows="5" animated />
      </router-view>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUpdateWorkspace } from './compositions/workspaces';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { useAuth } from '@/modules/core/compositions/authentication';

const route = useRoute();
const router = useRouter();
const { workspace, updateWorkspace, loaded, retry } = useUpdateWorkspace(route.params?.id as string);
const wsConfig = useWsConfiguration();
const { user } = useAuth();

const activeTab = ref('general');
const submitting = ref(false);

// Map tab names to route names
const tabRouteMap = {
  general: 'editMyWorkspaceGeneral',
  members: 'editMyWorkspaceMembers',
  payments: 'editMyWorkspacePayments',
  integrations: 'editMyWorkspaceIntegrations',
  security: 'editMyWorkspaceSecurity',
  advanced: 'editMyWorkspaceAdvanced'
};

// Control visibility of placeholder tabs
const showSecurityTab = computed(() => {
  // TODO: Check if security features are implemented
  return false; // Hide until implemented
});

const showAdvancedTab = computed(() => {
  // TODO: Check if advanced features are implemented
  return false; // Hide until implemented
});

const showPaymentsTab = computed(() => {
  // Show if user has admin role in the workspace
  if (!workspace.value || !user.value) return false;
  const member = workspace.value.members?.find(m => m.user === user.value._id);
  return member?.roles?.includes('admin') || false;
});

const showIntegrationsTab = computed(() => {
  // TODO: Check if integration features are implemented
  return false; // Hide until implemented
});

// Watch for route changes to update active tab
watch(() => route.name, (newName) => {
  const tabName = Object.keys(tabRouteMap).find(key => tabRouteMap[key] === newName);
  if (tabName) {
    activeTab.value = tabName;
  }
}, { immediate: true });

function handleTabChange(tabName: string) {
  const routeName = tabRouteMap[tabName];
  if (routeName && route.name !== routeName) {
    router.push({ name: routeName });
  }
}

async function handleTabSubmit(data: any) {
  submitting.value = true;
  try {
    await updateWorkspace(data);
  } catch (error) {
    console.error('Update error:', error);
  } finally {
    submitting.value = false;
  }
}

async function handleRefreshWorkspace() {
  try {
    await retry();
  } catch (error) {
    console.error('Refresh error:', error);
  }
}
</script>

<style scoped>
.edit-workspace {
  padding: 20px;
  margin: 0 auto;
}

.workspace-breadcrumb {
  margin-bottom: 20px;
  padding: 10px 0;
}

.breadcrumb-icon {
  margin-right: 5px;
  color: var(--el-color-primary);
}

.workspace-header {
  margin-bottom: 10px;
  padding: 20px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.workspace-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.workspace-logo {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  flex-shrink: 0;
}

.workspace-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.workspace-details h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.workspace-id {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
  font-family: monospace;
}

.workspace-tabs {
  margin-bottom: 0;
  width: 100%;
}

.tab-icon {
  margin-right: 8px;
}

:deep(.el-tabs__header) {
  margin-bottom: 0;
}

:deep(.el-tabs__content) {
  display: none;
}

@media (max-width: 768px) {
  .edit-workspace {
    padding: 10px;
  }
  
  .workspace-breadcrumb {
    margin-bottom: 15px;
    font-size: 0.9rem;
  }
  
  .workspace-info {
    flex-direction: column;
    text-align: center;
  }
  
  .workspace-details h1 {
    font-size: 1.5rem;
  }
  
  :deep(.el-tabs__header) {
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  
  :deep(.el-tabs__nav-wrap) {
    &::after {
      display: none;
    }
  }
  
  :deep(.el-tabs__item) {
    font-size: 0.9rem;
    padding: 0 10px;
    min-width: 100px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  
  :deep(.el-tabs__nav) {
    display: inline-flex;
    float: none;
  }
}
</style>
