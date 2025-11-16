<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { IIntegration, IntegrationSourceKind, QelosTriggerOperation, OpenAITargetOperation } from '@qelos/global-types';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { storeToRefs } from 'pinia';
import { ChatDotRound, Tools, Document, Setting } from '@element-plus/icons-vue';

// Import step components
import AgentIdentityStep from './steps/AgentIdentityStep.vue';
import AgentContextStep from './steps/AgentContextStep.vue';
import AgentConfigurationStep from './steps/AgentConfigurationStep.vue';
import AgentToolsStep from './steps/AgentToolsStep.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

defineProps<{
  integrationId?: string;
}>();

const workspacesConfig = useWsConfiguration()

const trigger = defineModel<IIntegration['trigger']>('trigger', { required: true });
const target = defineModel<IIntegration['target']>('target', { required: true });
const dataManipulation = defineModel<IIntegration['dataManipulation']>('dataManipulation', { required: true });
const currentStep = defineModel<number>('currentStep', { default: 0 });

const store = useIntegrationSourcesStore();
const { blueprints } = storeToRefs(useBlueprintsStore());

// Find Qelos and OpenAI sources
const qelosSource = computed(() => {
  return store.result?.find(s => s.kind === IntegrationSourceKind.Qelos);
});

const openAISources = computed(() => {
  return store.result?.filter(s => s.kind === IntegrationSourceKind.OpenAI) || [];
});

// Step 1: Agent Identity & Trigger
const agentName = computed({
  get: () => trigger.value?.details?.name || '',
  set: (value: string) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    trigger.value.details = {
      ...trigger.value.details,
      name: value
    };
  }
});

const agentDescription = computed({
  get: () => trigger.value?.details?.description || '',
  set: (value: string) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    trigger.value.details = {
      ...trigger.value.details,
      description: value
    };
  }
});

const recordThread = computed({
  get: () => trigger.value?.details?.recordThread || false,
  set: (value: boolean) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    trigger.value.details = {
      ...trigger.value.details,
      recordThread: value
    };
  }
});

// Step 2: Context & Data Manipulation
// Initialize from existing data manipulation
const detectExistingContext = () => {
  const dataManip = dataManipulation.value || [];
  
  // Check for workspace context in map
  const hasWorkspaceInMap = dataManip.some(step => 
    step.map && Object.keys(step.map).some(key => 
      key === 'workspace' || step.map[key]?.includes('workspace')
    )
  );
  
  // Check for user context in messages
  const hasUserInMessages = dataManip.some(step => 
    step.map?.messages && typeof step.map.messages === 'string' && 
    step.map.messages.includes('.user')
  );
  
  // Detect blueprint identifiers from populate steps
  const detectedBlueprints: string[] = [];
  dataManip.forEach(step => {
    if (step.populate) {
      Object.values(step.populate).forEach((populateConfig: any) => {
        if (populateConfig?.source === 'blueprintEntities' && populateConfig?.blueprint) {
          if (!detectedBlueprints.includes(populateConfig.blueprint)) {
            detectedBlueprints.push(populateConfig.blueprint);
          }
        }
      });
    }
  });
  
  return {
    hasWorkspace: hasWorkspaceInMap,
    hasUser: hasUserInMessages,
    blueprints: detectedBlueprints
  };
};

const initialContext = detectExistingContext();
const contextBlueprints = ref<string[]>(initialContext.blueprints);
const includeUserContext = ref(initialContext.hasUser);
const includeWorkspaceContext = ref(initialContext.hasWorkspace);

// Step 3: AI Configuration & Target
const selectedOpenAISource = computed({
  get: () => target.value?.source || '',
  set: (value: string) => {
    if (!target.value) {
      target.value = { source: '', operation: '', details: {} };
    }
    target.value.source = value;
    target.value.operation = OpenAITargetOperation.chatCompletion;
  }
});

const systemMessage = computed({
  get: () => {
    const preMessages = target.value?.details?.pre_messages || [];
    const systemMsg = preMessages.find(msg => msg.role === 'system');
    return systemMsg?.content || '';
  },
  set: (value: string) => {
    if (!target.value) {
      target.value = { source: '', operation: '', details: {} };
    }
    if (!target.value.details) {
      target.value.details = {};
    }
    if (!target.value.details.pre_messages) {
      target.value.details.pre_messages = [];
    }
    
    const systemMsgIndex = target.value.details.pre_messages.findIndex(msg => msg.role === 'system');
    if (value) {
      if (systemMsgIndex >= 0) {
        target.value.details.pre_messages[systemMsgIndex].content = value;
      } else {
        target.value.details.pre_messages.push({ role: 'system', content: value });
      }
    } else if (systemMsgIndex >= 0) {
      target.value.details.pre_messages.splice(systemMsgIndex, 1);
    }
  }
});

const model = computed({
  get: () => target.value?.details?.model || 'gpt-4o-mini',
  set: (value: string) => {
    if (!target.value?.details) return;
    target.value.details.model = value;
  }
});

const temperature = computed({
  get: () => target.value?.details?.temperature ?? 0.7,
  set: (value: number) => {
    if (!target.value?.details) return;
    target.value.details.temperature = value;
  }
});

const maxTokens = computed({
  get: () => target.value?.details?.max_tokens || 1000,
  set: (value: number) => {
    if (!target.value?.details) return;
    target.value.details.max_tokens = value;
  }
});

const ingestedBlueprints = computed({
  get: () => target.value?.details?.ingestedBlueprints || [],
  set: (value: string[]) => {
    if (!target.value?.details) return;
    target.value.details.ingestedBlueprints = value;
  }
});

const ingestedAgents = computed({
  get: () => target.value?.details?.ingestedAgents || [],
  set: (value: string[]) => {
    if (!target.value?.details) return;
    target.value.details.ingestedAgents = value;
  }
});

// Initialize trigger and target if not set
watch([trigger, target], ([newTrigger, newTarget]) => {
  if (!newTrigger?.source && qelosSource.value) {
    trigger.value = {
      source: qelosSource.value._id || '',
      operation: QelosTriggerOperation.chatCompletion,
      details: newTrigger?.details || {}
    };
  }
  
  if (!newTarget?.source && openAISources.value.length > 0) {
    target.value = {
      source: openAISources.value[0]._id || '',
      operation: OpenAITargetOperation.chatCompletion,
      details: newTarget?.details || {}
    };
  }
}, { immediate: true, deep: true });

// Check if data manipulation appears to be auto-generated (not manually customized)
const isAutoGeneratedDataManipulation = () => {
  const dataManip = dataManipulation.value || [];
  
  // Empty or very simple structure is safe to regenerate
  if (dataManip.length === 0) return true;
  
  // Check if it matches our auto-generation pattern
  const hasExpectedStructure = dataManip.every(step => {
    // Our auto-generated steps have specific patterns
    const hasMapOrPopulate = step.map || step.populate;
    
    // Check for our specific keys
    if (step.map) {
      const mapKeys = Object.keys(step.map);
      const hasOurKeys = mapKeys.some(key => 
        key === 'workspace' || 
        key === 'messages' ||
        blueprints.value?.some(b => b.name === key)
      );
      if (!hasOurKeys && mapKeys.length > 0) return false;
    }
    
    if (step.populate) {
      const populateValues = Object.values(step.populate);
      const hasOurPattern = populateValues.every((val: any) => 
        val?.source === 'blueprintEntities' || 
        val?.source === 'user' || 
        val?.source === 'workspace'
      );
      if (!hasOurPattern && populateValues.length > 0) return false;
    }
    
    return hasMapOrPopulate;
  });
  
  return hasExpectedStructure;
};

// Track if user has manually modified context selections
const hasManualChanges = ref(false);

// Generate data manipulation based on context selections
const generateDataManipulation = () => {
  // Don't regenerate if data manipulation was manually customized
  if (!isAutoGeneratedDataManipulation() && !hasManualChanges.value) {
    return;
  }
  
  const steps: any[] = [];
  
  if (contextBlueprints.value.length > 0 || includeUserContext.value || includeWorkspaceContext.value) {
    const mapStep: any = { map: {}, populate: {} };
    
    if (includeWorkspaceContext.value) {
      mapStep.map.workspace = { workspace: 'user.workspace' };
    }

    if (contextBlueprints.value.length > 0) {
      contextBlueprints.value.forEach(blueprintId => {
        const blueprint = blueprints.value?.find(b => b.identifier === blueprintId);
        if (blueprint) {
          mapStep.map[blueprint.name] = workspacesConfig.metadata.isActive ? `{ workspace: .user.workspace._id }` : `{ user: .user._id }`;
        }
      });
    }
    
    steps.push(mapStep);
    
    if (contextBlueprints.value.length > 0) {
      const blueprintStep: any = { map: {}, populate: {} };
      
      contextBlueprints.value.forEach(blueprintId => {
        const blueprint = blueprints.value?.find(b => b.identifier === blueprintId);
        if (blueprint) {
          blueprintStep.populate[blueprint.name] = {
            source: 'blueprintEntities',
            blueprint: blueprintId
          };
        }
      });
      
      steps.push(blueprintStep);
      
      const contextParts: string[] = [];
      if (includeUserContext.value) contextParts.push('(.user | tostring)');
      if (includeWorkspaceContext.value) contextParts.push('(.workspace | tostring)');
      contextBlueprints.value.forEach(blueprintId => {
        const blueprint = blueprints.value?.find(b => b.identifier === blueprintId);
        if (blueprint) {
          contextParts.push(`(.${blueprint.name} | tostring)`);
        }
      });
      
      const contextString = contextParts.join(' + " " + ');
      steps.push({
        map: {
          messages: `([{role: "system", content: "Context: " + ${contextString}}] + .messages)`
        },
        populate: {}
      });
    }
  }
  
  dataManipulation.value = steps;
};

// Watch for manual changes to context selections
watch([contextBlueprints, includeUserContext, includeWorkspaceContext], (newValues, oldValues) => {
  // Skip the initial watch trigger
  if (oldValues && oldValues.some(val => val !== undefined)) {
    hasManualChanges.value = true;
    generateDataManipulation();
  }
}, { deep: true });
</script>

<template>
  <div class="ai-agent-form">
    <!-- Steps Navigation - Sticky Header -->
    <div class="steps-header-sticky">
      <el-steps :active="currentStep" finish-status="success" align-center class="mb-6">
        <el-step :title="$t('Agent Identity')" :icon="ChatDotRound" />
        <el-step :title="$t('Context & Data')" :icon="Document" />
        <el-step :title="$t('AI Configuration')" :icon="Setting" />
        <el-step :title="$t('Tools & Functions')" :icon="Tools" />
      </el-steps>
    </div>

    <el-form label-position="top" class="agent-form">
      <!-- Step 0: Agent Identity -->
      <AgentIdentityStep
        v-show="currentStep === 0"
        v-model:agent-name="agentName"
        v-model:agent-description="agentDescription"
        v-model:record-thread="recordThread"
        :integration-id="integrationId"
      />

      <!-- Step 1: Context & Data -->
      <AgentContextStep
        v-show="currentStep === 1"
        v-model:context-blueprints="contextBlueprints"
        v-model:include-user-context="includeUserContext"
        v-model:include-workspace-context="includeWorkspaceContext"
      />

      <!-- Step 2: AI Configuration -->
      <AgentConfigurationStep
        v-show="currentStep === 2"
        v-model:selected-open-a-i-source="selectedOpenAISource"
        v-model:system-message="systemMessage"
        v-model:model="model"
        v-model:temperature="temperature"
        v-model:max-tokens="maxTokens"
      />

      <!-- Step 3: Tools & Functions -->
      <AgentToolsStep
        v-show="currentStep === 3"
        v-model:ingested-blueprints="ingestedBlueprints"
        v-model:ingested-agents="ingestedAgents"
        :integration-id="integrationId"
      />
    </el-form>
  </div>
</template>

<style scoped>
.ai-agent-form {
  padding: 20px 0;
  max-width: 900px;
  margin: 0 auto;
}

.steps-header-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--el-bg-color);
  padding: 16px 0;
  margin: -20px 0 0 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.mb-6 {
  margin-bottom: 24px;
}

.agent-form {
  width: 100%;
  padding-top: 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

:deep(.el-steps) {
  padding: 0 20px;
}

:deep(.el-step__title) {
  font-size: 13px;
}

@media (max-width: 768px) {
  .ai-agent-form {
    padding: 10px;
  }
  
  :deep(.el-steps) {
    padding: 0;
  }
}
</style>
