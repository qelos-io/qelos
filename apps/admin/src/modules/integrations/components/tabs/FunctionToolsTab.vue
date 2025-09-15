<script setup lang="ts">
import { computed } from 'vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { IIntegration, OpenAITargetOperation } from '@qelos/global-types';
import { ElMessage } from 'element-plus';
import integrationsService from '@/services/integrations-service';
import { Check as IconCheck, Close as IconClose, ArrowDown } from '@element-plus/icons-vue';

const props = defineProps<{
  integrationId: string;
}>();

const integrationsStore = useIntegrationsStore();

// Get all function calling integrations
const functionCallingIntegrations = computed(() => 
  integrationsStore.integrations?.filter(integration => 
    integration.trigger.source && 
    integration.trigger.operation === OpenAITargetOperation.functionCalling
  ) || []
);

// Check if all functions are enabled
const areAllFunctionsEnabled = computed(() => {
  if (functionCallingIntegrations.value.length === 0) return true;
  return functionCallingIntegrations.value.every(func => isFunctionApplied(func));
});

// Check if all functions are disabled
const areAllFunctionsDisabled = computed(() => {
  if (functionCallingIntegrations.value.length === 0) return true;
  return functionCallingIntegrations.value.every(func => !isFunctionApplied(func));
});

// Function to check if a function is applied (not blocked and either allowed or no restrictions)
const isFunctionApplied = (integration: IIntegration) => {
  // If explicitly blocked, it's not applied
  if (integration.trigger.details.blockedIntegrationIds?.includes(props.integrationId)) return false;
  
  // If allow list is empty or has wildcard, it's applied
  if (!integration.trigger.details.allowedIntegrationIds?.length || 
      integration.trigger.details.allowedIntegrationIds.includes('*')) return true;
  
  // Otherwise, check if it's in the allow list
  return integration.trigger.details.allowedIntegrationIds.includes(props.integrationId);
};

// Toggle function application status
const toggleFunctionStatus = async (integration: IIntegration, apply: boolean, isMultiple: boolean = false) => {
  const newModelValue = { ...integration };
  
  // Initialize details and lists if they don't exist
  if (!newModelValue.trigger.details) newModelValue.trigger.details = {};
  if (!newModelValue.trigger.details.allowedIntegrationIds) newModelValue.trigger.details.allowedIntegrationIds = [];
  if (!newModelValue.trigger.details.blockedIntegrationIds) newModelValue.trigger.details.blockedIntegrationIds = [];
  
  if (apply) {
    // Apply function: remove from blocked list
    newModelValue.trigger.details.blockedIntegrationIds = 
      newModelValue.trigger.details.blockedIntegrationIds.filter(id => id !== props.integrationId);
    
    // If allow list is not empty and doesn't have wildcard, add to allow list
    if (newModelValue.trigger.details.allowedIntegrationIds.length > 0 && 
        !newModelValue.trigger.details.allowedIntegrationIds.includes('*') &&
        !newModelValue.trigger.details.allowedIntegrationIds.includes(props.integrationId)) {
      newModelValue.trigger.details.allowedIntegrationIds.push(props.integrationId);
    }
  } else {
    // Shut down function: add to blocked list if not already there
    if (!newModelValue.trigger.details.blockedIntegrationIds.includes(props.integrationId)) {
      newModelValue.trigger.details.blockedIntegrationIds.push(props.integrationId);
    }
    
    // Remove from allow list if present
    newModelValue.trigger.details.allowedIntegrationIds = 
      newModelValue.trigger.details.allowedIntegrationIds.filter(id => id !== props.integrationId);
  }
  
  await integrationsService.update(integration._id, newModelValue);

  if (!isMultiple) {
    integrationsStore.retry();
    ElMessage({
      message: apply ? 'Function applied successfully' : 'Function disabled successfully',
      type: apply ? 'success' : 'warning',
      duration: 2000
    });
  }
};

// Handle bulk actions from dropdown menu
const handleBulkAction = async (command: string) => {
  if (command === 'allowAll') {
    await allowAllFunctions();
  } else if (command === 'blockAll') {
    await blockAllFunctions();
  }
};

// Set wildcard to allow all functions
const allowAllFunctions = async () => {
  await Promise.all(functionCallingIntegrations.value.map(func => toggleFunctionStatus(func, true, true)));
  integrationsStore.retry();
  ElMessage({
    message: 'All functions are now enabled',
    type: 'success',
    duration: 2000
  });
};

// Block all functions
const blockAllFunctions = async () => {
  await Promise.all(functionCallingIntegrations.value.map(func => toggleFunctionStatus(func, false, true)));
  integrationsStore.retry();
  ElMessage({
    message: 'All functions are now disabled',
    type: 'warning',  
    duration: 2000
  });
};
</script>

<template>
  <div class="function-tools-container">
    <el-alert type="info" :closable="false" class="mb-3">
      {{ $t('Manage function tools that can be used by this chat completion integration.') }}
    </el-alert>
    
    <div class="function-tools-header">
      <div class="function-tools-title">
        <h3>{{ $t('Function Tools') }}</h3>
        <span class="function-count">{{ functionCallingIntegrations.length }} {{ $t('available') }}</span>
      </div>
      
      <div class="function-tools-actions">
        <el-dropdown trigger="click" @command="handleBulkAction">
          <el-button type="primary" plain size="small">
            {{ $t('Bulk Actions') }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="allowAll" :disabled="areAllFunctionsEnabled">
                <el-icon><icon-check /></el-icon>
                {{ $t('Enable All') }}
              </el-dropdown-item>
              <el-dropdown-item command="blockAll" :disabled="areAllFunctionsDisabled">
                <el-icon><icon-close /></el-icon>
                {{ $t('Disable All') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    
    <div v-if="functionCallingIntegrations.length === 0" class="no-functions-message">
      <el-empty :description="$t('No function calling integrations found')" />
    </div>
    
    <div v-else class="function-rows-container">
      <div 
        v-for="func in functionCallingIntegrations" 
        :key="func._id"
        class="function-row"
        :class="{ 'disabled': !isFunctionApplied(func) }"
      >
        <div class="function-row-content">
          <div class="function-info">
            <h3 class="function-name">{{ func.trigger.details?.name || 'Unnamed Function' }}</h3>
            <p class="function-description">{{ func.trigger.details?.description || 'No description' }}</p>
          </div>
          
          <div class="function-controls">
            <el-popover
              placement="left"
              trigger="hover"
              :width="400"
            >
              <template #reference>
                <el-button size="small" type="info" plain>
                  {{ $t('View Parameters') }}
                </el-button>
              </template>
              <pre class="parameters-preview">{{ JSON.stringify(func.trigger.details?.parameters || {}, null, 2) }}</pre>
            </el-popover>
            
            <el-tooltip :content="$t(isFunctionApplied(func) ? 'Disable Function' : 'Enable Function')" placement="top">
              <el-button 
                :type="isFunctionApplied(func) ? 'success' : 'info'" 
                circle 
                @click="toggleFunctionStatus(func, !isFunctionApplied(func))"
              >
                <el-icon><icon-check v-if="isFunctionApplied(func)" /><icon-close v-else /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.function-tools-container {
  padding: 10px 0;
}

.mb-3 {
  margin-bottom: 15px;
}

.function-tools-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.function-tools-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.function-tools-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.function-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.function-tools-actions {
  display: flex;
  gap: 10px;
}

.function-rows-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

.function-row {
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.function-row:hover {
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
}

.function-row.disabled {
  opacity: 0.4;
  background-color: var(--el-fill-color-light);
}

.function-row-content {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.function-info {
  flex: 1;
  min-width: 0; /* Needed for text truncation to work */
}

.function-name {
  font-weight: 600;
  margin: 0 0 4px 0;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.function-description {
  font-size: 0.85em;
  color: var(--el-text-color-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.function-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.parameters-preview {
  max-height: 300px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  background-color: var(--el-bg-color-page);
  padding: 10px;
  border-radius: 4px;
  margin: 0;
}

.no-functions-message {
  margin-top: 40px;
  text-align: center;
}

@media (max-width: 768px) {
  .function-row-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .function-controls {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
