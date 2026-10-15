<script setup lang="ts">
import { computed } from 'vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { IIntegration, OpenAITriggerOperation } from '@qelos/global-types';
import { ElMessage } from 'element-plus';
import integrationsService from '@/services/apis/integrations-service';
import { Check as IconCheck } from '@element-plus/icons-vue';

const props = defineProps<{
  integrationId: string;
}>();

const integrationsStore = useIntegrationsStore();

// Get all function calling integrations
const functionCallingIntegrations = computed(() => 
  integrationsStore.integrations?.filter(integration => 
    integration.trigger.source && 
    integration.trigger.operation === OpenAITriggerOperation.functionCalling
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
  <div class="function-tools">
    <header v-if="functionCallingIntegrations.length" class="bar">
      <span class="count">{{ functionCallingIntegrations.length }} {{ $t('available') }}</span>
      <el-dropdown trigger="click" @command="handleBulkAction">
        <el-button text size="small">{{ $t('Bulk Actions') }}<el-icon class="el-icon--right"><icon-arrow-down /></el-icon></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="allowAll" :disabled="areAllFunctionsEnabled">{{ $t('Enable All') }}</el-dropdown-item>
            <el-dropdown-item command="blockAll" :disabled="areAllFunctionsDisabled">{{ $t('Disable All') }}</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </header>

    <p v-if="functionCallingIntegrations.length === 0" class="empty">{{ $t('No function calling integrations found') }}. {{ $t('Create a workflow that starts from a function call, and it shows up here.') }}</p>

    <ul v-else class="rows">
      <li v-for="func in functionCallingIntegrations" :key="func._id" class="row" :class="{ off: !isFunctionApplied(func) }">
        <div class="info">
          <strong dir="auto">{{ func.trigger.details?.name || $t('Unnamed function') }}</strong>
          <span dir="auto">{{ func.trigger.details?.description || $t('No description') }}</span>
        </div>
        <el-popover placement="left" trigger="click" :width="400">
          <template #reference><el-button text size="small">{{ $t('Parameters') }}</el-button></template>
          <pre class="params" dir="ltr">{{ JSON.stringify(func.trigger.details?.parameters || {}, null, 2) }}</pre>
        </el-popover>
        <el-switch :model-value="isFunctionApplied(func)" :aria-label="`${$t('Enable Function')}: ${func.trigger.details?.name || ''}`" @change="(value: boolean) => toggleFunctionStatus(func, value)" />
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-block-end: 8px;
}

.count,
.empty {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.88rem;
  text-align: start;
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  transition: opacity 0.15s ease;

  &.off {
    opacity: 0.6;
  }
}

.info {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-inline-size: 0;

  strong,
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: var(--el-text-color-secondary);
    font-size: 0.85rem;
  }
}

.params {
  max-block-size: 300px;
  margin: 0;
  padding: 10px;
  overflow: auto;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  font-size: 0.8rem;
  text-align: start;
}

@media (prefers-reduced-motion: reduce) {
  .row {
    transition: none;
  }
}
</style>
