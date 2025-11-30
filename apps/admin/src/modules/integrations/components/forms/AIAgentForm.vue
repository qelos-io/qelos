<script setup lang="ts">
import { computed, watch, watchEffect, ref, onMounted } from 'vue';
import { IIntegration, IntegrationSourceKind, QelosTriggerOperation, OpenAITargetOperation } from '@qelos/global-types';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { storeToRefs } from 'pinia';
import { ChatDotRound, Tools, Document, Setting, Lock, Link as LinkIcon, ArrowDown } from '@element-plus/icons-vue';
import FunctionToolsTab from '@/modules/integrations/components/tabs/FunctionToolsTab.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import WorkspaceLabelSelector from '@/modules/no-code/components/WorkspaceLabelSelector.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import { ElMessage } from 'element-plus';
import { getPlural } from '@/modules/core/utils/texts';

const props = defineProps<{
  integrationId?: string;
}>();

const workspacesConfig = useWsConfiguration();

const trigger = defineModel<IIntegration['trigger']>('trigger', { required: true });
const target = defineModel<IIntegration['target']>('target', { required: true });
const dataManipulation = defineModel<IIntegration['dataManipulation']>('dataManipulation', { required: true });

const store = useIntegrationSourcesStore();
const { blueprints } = storeToRefs(useBlueprintsStore());
const integrationsStore = useIntegrationsStore();

const PANEL_IDS = ['rolesIdentity', 'systemPrompt', 'connections'] as const;
type PanelId = typeof PANEL_IDS[number];

const isEditMode = computed(() => Boolean(props.integrationId));
const collapsedPanels = ref<PanelId[]>([]);

const resetPanels = () => {
  if (isEditMode.value) {
    collapsedPanels.value = PANEL_IDS.filter(panel => panel !== 'systemPrompt');
  } else {
    collapsedPanels.value = [];
  }
};

watch(() => props.integrationId, () => {
  resetPanels();
}, { immediate: true });

const isPanelOpen = (panel: PanelId) => !collapsedPanels.value.includes(panel);

const togglePanel = (panel: PanelId) => {
  if (isPanelOpen(panel)) {
    collapsedPanels.value = [...collapsedPanels.value, panel];
  } else {
    collapsedPanels.value = collapsedPanels.value.filter(item => item !== panel);
  }
};

// Find Qelos and OpenAI sources
const qelosSource = computed(() => {
  return store.result?.find(s => s.kind === IntegrationSourceKind.Qelos);
});

const openAISources = computed(() => {
  return store.result?.filter(s => s.kind === IntegrationSourceKind.OpenAI) || [];
});

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

const accessControlPermissions = computed({
  get: () => ({
    roles: trigger.value?.details?.roles || [],
    workspaceRoles: trigger.value?.details?.workspaceRoles || [],
    workspaceLabels: trigger.value?.details?.workspaceLabels || []
  }),
  set: (value: { roles?: string[]; workspaceRoles?: string[]; workspaceLabels?: string[] }) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    trigger.value.details = {
      ...trigger.value.details,
      roles: value.roles || [],
      workspaceRoles: value.workspaceRoles || [],
      workspaceLabels: value.workspaceLabels || []
    };
  }
});

const availableWorkspaceLabels = computed(() => {
  const labels = workspacesConfig.metadata.labels || [];
  const flattened = labels.flatMap(label => label.value || []);
  const unique = Array.from(new Set(flattened));
  return ['*', ...unique];
});

const safeArray = (value?: string[]) => (Array.isArray(value) ? value : []);

const rolesModel = computed<string[]>({
  get: () => safeArray(accessControlPermissions.value.roles),
  set: (value) => {
    accessControlPermissions.value = {
      ...accessControlPermissions.value,
      roles: value
    };
  }
});

watchEffect(() => {
  if (!isEditMode.value && rolesModel.value.length === 0) {
    rolesModel.value = ['*'];
  }
});

const workspaceRolesModel = computed<string[]>({
  get: () => safeArray(accessControlPermissions.value.workspaceRoles),
  set: (value) => {
    accessControlPermissions.value = {
      ...accessControlPermissions.value,
      workspaceRoles: value
    };
  }
});

const workspaceLabelsModel = computed<string[]>({
  get: () => safeArray(accessControlPermissions.value.workspaceLabels),
  set: (value) => {
    accessControlPermissions.value = {
      ...accessControlPermissions.value,
      workspaceLabels: value
    };
  }
});

const guestAllowed = computed({
  get: () => rolesModel.value.includes('guest'),
  set: (value: boolean) => {
    const withoutGuest = rolesModel.value.filter(role => role !== 'guest');
    rolesModel.value = value ? [...withoutGuest, 'guest'] : withoutGuest;
  }
});

const completionUrl = computed(() => {
  if (!props.integrationId) return '';
  const baseUrl = `/api/ai/${props.integrationId}/chat-completion`;
  return recordThread.value ? `${baseUrl}/[threadId]` : baseUrl;
});

const copyCompletionUrl = async () => {
  if (!completionUrl.value) return;
  await navigator.clipboard?.writeText(completionUrl.value);
  ElMessage.success('Copied to clipboard');
};

const systemMessageVariables = [
  'currentDate',
  'currentDateTime',
  'userId',
  'userEmail',
  'userFirstName',
  'userLastName',
  'userRoles',
  'workspaceId',
  'workspaceName',
  'workspaceLabels'
];

const getVariableTemplate = (key: string) => `{{${key}}}`;

const copyVariableToClipboard = (key: string) => {
  navigator.clipboard.writeText(getVariableTemplate(key));
  ElMessage.success('Copied to clipboard');
};

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
  get: () => target.value?.details?.model || 'gpt-4o',
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

const availableModels = [
  { label: 'GPT-5', value: 'gpt-5', description: 'Next generation flagship model' },
  { label: 'GPT-5 Turbo', value: 'gpt-5-turbo', description: 'GPT-5 optimized version' },
  { label: 'GPT-5 Turbo Preview', value: 'gpt-5-turbo-preview', description: 'GPT-5 Turbo preview' },
  { label: 'GPT-4o', value: 'gpt-4o', description: 'Most capable, multimodal flagship model' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini', description: 'Affordable and intelligent small model' },
  { label: 'GPT-4o Nano', value: 'gpt-4o-nano', description: 'Ultra-efficient, lightweight model' },
  { label: 'GPT-4.1', value: 'gpt-4.1', description: 'Enhanced GPT-4 model' },
  { label: 'GPT-4.1 Turbo', value: 'gpt-4.1-turbo', description: 'GPT-4.1 optimized version' },
  { label: 'GPT-4.1 Preview', value: 'gpt-4.1-preview', description: 'GPT-4.1 preview version' },
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo', description: 'Latest GPT-4 Turbo' },
  { label: 'GPT-4 Turbo Preview', value: 'gpt-4-turbo-preview', description: 'GPT-4 Turbo preview' },
  { label: 'GPT-4', value: 'gpt-4', description: 'Latest GPT-4 model' },
  { label: 'GPT-4 32k', value: 'gpt-4-32k', description: '32k context window' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', description: 'Latest GPT-3.5 Turbo' },
  { label: 'GPT-3.5 Turbo Instruct', value: 'gpt-3.5-turbo-instruct', description: 'Instruction-following model' },
  { label: 'O1', value: 'o1', description: 'Advanced reasoning model' },
  { label: 'O1 Preview', value: 'o1-preview', description: 'O1 preview version' },
  { label: 'O1 Mini', value: 'o1-mini', description: 'Faster, cheaper reasoning model' }
];

const connectedAgents = computed(() => integrationsStore.integrations?.filter(integration =>
  integration._id !== props.integrationId &&
  integration.kind[0] === IntegrationSourceKind.Qelos &&
  integration.trigger.operation === QelosTriggerOperation.chatCompletion
));

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

onMounted(() => {
  const sources = openAISources.value;
  if (!isEditMode.value && sources.length > 0) {
    target.value = {
      ...target.value,
      source: sources[0]._id || '',
      operation: OpenAITargetOperation.chatCompletion,
      details: target.value?.details || {}
    };
  }
});

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
      mapStep.map.workspace = `.user.workspace`;
    }

    if (contextBlueprints.value.length > 0) {
      contextBlueprints.value.forEach(blueprintId => {
        const blueprint = blueprints.value?.find(b => b.identifier === blueprintId);
        if (blueprint) {
          mapStep.map[getPlural(blueprint.identifier)] = workspacesConfig.metadata.isActive ? `{ workspace: .user.workspace._id }` : `{ user: .user._id }`;
        }
      });
    }
    
    steps.push(mapStep);
    
    if (contextBlueprints.value.length > 0) {
      const blueprintStep: any = { map: {}, populate: {} };
      
      contextBlueprints.value.forEach(blueprintId => {
        const blueprint = blueprints.value?.find(b => b.identifier === blueprintId);
        if (blueprint) {
          blueprintStep.populate[getPlural(blueprint.identifier)] = {
            source: 'blueprintEntities',
            blueprint: blueprintId
          };
        }
      });
      
      
      steps.push(blueprintStep);
    }
    
    const contextParts: string[] = [];
    if (includeUserContext.value) contextParts.push('"User: " + (.user | tostring)');
    if (includeWorkspaceContext.value) contextParts.push('"Workspace: " + (.workspace | tostring)');
    contextBlueprints.value.forEach(blueprintId => {
      const blueprint = blueprints.value?.find(b => b.identifier === blueprintId);
      if (blueprint) {
        contextParts.push(`"${getPlural(blueprint.name)}: " + (.${getPlural(blueprint.identifier)} | tostring)`);
      }
    });
    
    const contextString = contextParts.join(' + "\n" + ');
    steps.push({
      map: {
        messages: `([{role: "system", content: ("Context: " + ${contextString})}] + .messages)`
      },
      populate: {}
    });
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
    <el-row :gutter="24" class="form-grid">
      <el-col :xs="24" :lg="15" class="main-column">
        <el-card
          shadow="never"
          class="panel-card"
          :class="{ 'is-collapsed': !isPanelOpen('rolesIdentity') }"
        >
          <template #header>
            <button class="panel-toggle" type="button" @click="togglePanel('rolesIdentity')">
              <div class="panel-header">
                <el-icon class="panel-icon"><Lock /></el-icon>
                <div>
                  <h3>{{ $t('Roles & Identity') }}</h3>
                  <p>{{ $t('Control who can talk to this agent and how it identifies itself.') }}</p>
                </div>
              </div>
              <el-icon class="collapse-icon" :class="{ 'is-open': isPanelOpen('rolesIdentity') }"><ArrowDown /></el-icon>
            </button>
          </template>

          <section v-show="isPanelOpen('rolesIdentity')" class="section-block">
            <div class="section-title">{{ $t('Roles & Permissions') }}</div>
            <p class="section-description">
              {{ $t('Define user, workspace, or label-based rules to trigger the agent.') }}
            </p>
            <el-alert
              type="info"
              :closable="false"
              class="section-alert"
            >
              {{ $t('Guest access, platform roles, workspace roles, and labels can be combined.') }}
            </el-alert>

            <FormRowGroup wrap class="permissions-grid">
              <el-form-item class="flex-item">
                <template #label>
                  {{ $t('Guest Access') }}
                  <InfoIcon :content="$t('Allow unauthenticated visitors to start conversations.')" />
                </template>
                <el-switch v-model="guestAllowed" />
              </el-form-item>

              <LabelsInput
                class="flex-item"
                :title="$t('User Roles')"
                :info="$t('Require at least one of these platform roles.')"
                v-model="rolesModel"
              >
                <el-option label="All Authenticated (*)" value="*" />
                <el-option label="Admin" value="admin" />
                <el-option label="User" value="user" />
                <el-option label="Guest" value="guest" />
              </LabelsInput>

              <LabelsInput
                class="flex-item"
                :title="$t('Workspace Roles')"
                :info="$t('Require workspace roles for members triggering the agent.')"
                v-model="workspaceRolesModel"
              >
                <el-option label="All Workspace Roles (*)" value="*" />
                <el-option label="Admin" value="admin" />
                <el-option label="Member" value="member" />
                <el-option label="User" value="user" />
              </LabelsInput>

              <WorkspaceLabelSelector
                class="flex-item"
                :title="$t('Workspace Labels')"
                :available-labels="availableWorkspaceLabels"
                :info="$t('Limit access to labeled workspaces.')"
                v-model="workspaceLabelsModel"
              />
            </FormRowGroup>
          </section>

          <el-divider />

          <section v-show="isPanelOpen('rolesIdentity')" class="section-block">
            <div class="section-title">{{ $t('Agent Identity') }}</div>
            <p class="section-description">
              {{ $t('Give the agent a clear purpose and decide whether to record threads.') }}
            </p>

            <el-form-item :label="$t('Agent Name')" required>
              <el-input
                v-model="agentName"
                :placeholder="$t('e.g., Customer Support Agent')"
                size="large"
              />
            </el-form-item>

            <el-form-item :label="$t('Agent Description')">
              <el-input
                v-model="agentDescription"
                type="textarea"
                :rows="3"
                :placeholder="$t('Describe what this agent does...')"
              />
            </el-form-item>

            <div class="recording-row">
              <el-checkbox v-model="recordThread">
                {{ $t('Record conversation threads') }}
              </el-checkbox>
              <span class="recording-hint">
                {{ $t('When enabled, the API URL expects a thread identifier.') }}
              </span>
            </div>

            <div v-if="props.integrationId" class="endpoint-box">
              <div class="endpoint-title">
                <el-icon><LinkIcon /></el-icon>
                <span>{{ $t('Agent Endpoint') }}</span>
              </div>
              <el-input :value="completionUrl" readonly dir="ltr">
                <template #append>
                  <el-button @click="copyCompletionUrl">
                    {{ $t('Copy') }}
                  </el-button>
                </template>
              </el-input>
            </div>
          </section>
        </el-card>

        <el-card
          shadow="never"
          class="panel-card"
          :class="{ 'is-collapsed': !isPanelOpen('systemPrompt') }"
        >
          <template #header>
            <button class="panel-toggle" type="button" @click="togglePanel('systemPrompt')">
              <div class="panel-header">
                <el-icon class="panel-icon"><Document /></el-icon>
                <div>
                  <h3>{{ $t('System Prompt & Context') }}</h3>
                  <p>{{ $t('Craft the system behavior and decide what context is injected.') }}</p>
                </div>
              </div>
              <el-icon class="collapse-icon" :class="{ 'is-open': isPanelOpen('systemPrompt') }"><ArrowDown /></el-icon>
            </button>
          </template>

          <section v-show="isPanelOpen('systemPrompt')" class="section-block">
            <div class="section-title">{{ $t('System Prompt') }}</div>
            <p class="section-description">
              {{ $t('Define the role, tone, and responsibilities of the agent.') }}
            </p>
            <p class="variables-hint">
              {{ $t('Available variables') }}:
              <el-tag
                v-for="key in systemMessageVariables"
                :key="key"
                class="variable-tag"
                size="small"
                @click="copyVariableToClipboard(key)"
              >{{ getVariableTemplate(key) }}</el-tag>
            </p>
            <el-input
              v-model="systemMessage"
              type="textarea"
              :rows="8"
              :placeholder="$t('You are a helpful assistant that...')"
            />
          </section>

          <el-divider />

          <section v-show="isPanelOpen('systemPrompt')" class="section-block">
            <div class="section-title">{{ $t('Context Sources') }}</div>
            <p class="section-description">
              {{ $t('Select user, workspace, and blueprint data to provide richer answers.') }}
            </p>

            <div class="context-grid">
              <div class="context-card">
                <div class="card-heading">
                  <el-icon><ChatDotRound /></el-icon>
                  <span>{{ $t('User & Workspace Context') }}</span>
                </div>
                <el-checkbox v-model="includeUserContext" class="context-checkbox">
                  {{ $t('Include user information') }}
                </el-checkbox>
                <el-checkbox v-if="workspacesConfig.isActive" v-model="includeWorkspaceContext" class="context-checkbox">
                  {{ $t('Include workspace information') }}
                </el-checkbox>
              </div>

              <div class="context-card">
                <div class="card-heading">
                  <el-icon><Document /></el-icon>
                  <span>{{ $t('Blueprint Context') }}</span>
                </div>
                <el-select
                  v-model="contextBlueprints"
                  multiple
                  filterable
                  collapse-tags-tooltip
                  :placeholder="$t('Select blueprints')"
                  class="w-full"
                >
                  <el-option
                    v-for="blueprint in blueprints"
                    :key="blueprint.identifier"
                    :label="blueprint.name"
                    :value="blueprint.identifier"
                  />
                </el-select>
              </div>
            </div>
          </section>
        </el-card>

        <el-card
          shadow="never"
          class="panel-card"
          :class="{ 'is-collapsed': !isPanelOpen('connections') }"
        >
          <template #header>
            <button class="panel-toggle" type="button" @click="togglePanel('connections')">
              <div class="panel-header">
                <el-icon class="panel-icon"><Tools /></el-icon>
                <div>
                  <h3>{{ $t('Connections & Tools') }}</h3>
                  <p>{{ $t('Decide which blueprints, agents, and functions this agent can call.') }}</p>
                </div>
              </div>
              <el-icon class="collapse-icon" :class="{ 'is-open': isPanelOpen('connections') }"><ArrowDown /></el-icon>
            </button>
          </template>

          <section v-show="isPanelOpen('connections')" class="section-block">
            <div class="section-title">{{ $t('Connect to other blueprints') }}</div>
            <el-select
              v-model="ingestedBlueprints"
              multiple
              filterable
              collapse-tags-tooltip
              :placeholder="$t('Select blueprints to expose as tools')"
              class="w-full section-spacer"
            >
              <el-option
                v-for="blueprint in blueprints"
                :key="blueprint.identifier"
                :label="blueprint.name"
                :value="blueprint.identifier"
              />
            </el-select>
          </section>

          <section v-show="isPanelOpen('connections')" class="section-block">
            <div class="section-title">{{ $t('Connect to other agents') }}</div>
            <el-select
              v-model="ingestedAgents"
              multiple
              filterable
              collapse-tags-tooltip
              :placeholder="$t('Select agents to collaborate with')"
              class="w-full section-spacer"
            >
              <el-option
                v-for="agent in connectedAgents"
                :key="agent._id"
                :label="agent.trigger.details?.name || 'Unnamed Agent'"
                :value="agent._id"
              />
            </el-select>
          </section>

          <section v-show="isPanelOpen('connections')" class="section-block">
            <div class="section-title">{{ $t('Custom functions') }}</div>
            <p class="section-description">
              {{ $t('Expose REST endpoints or workflows as callable tools.') }}
            </p>
            <FunctionToolsTab v-if="props.integrationId" :integration-id="props.integrationId" />
            <el-alert v-else type="warning" :closable="false" show-icon>
              {{ $t('Save the integration first to configure custom function tools.') }}
            </el-alert>
          </section>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="9" class="sidebar-column">
        <el-card shadow="never" class="panel-card sticky-panel">
          <template #header>
            <div class="panel-header">
              <el-icon class="panel-icon"><Setting /></el-icon>
              <div>
                <h3>{{ $t('Advanced AI Settings') }}</h3>
                <p>{{ $t('Model, provider, and response controls.') }}</p>
              </div>
            </div>
          </template>

          <el-form label-position="top">
            <el-form-item :label="$t('OpenAI Source')" required>
              <el-select
                v-model="selectedOpenAISource"
                :placeholder="$t('Select OpenAI connection')"
                size="large"
                class="w-full"
              >
                <el-option
                  v-for="source in openAISources"
                  :key="source._id"
                  :label="source.name"
                  :value="source._id"
                />
              </el-select>
            </el-form-item>

            <el-form-item :label="$t('Model')" required>
              <el-select
                v-model="model"
                :placeholder="$t('Select or type a model name')"
                size="large"
                class="w-full"
                filterable
                allow-create
                default-first-option
              >
                <el-option
                  v-for="modelOption in availableModels"
                  :key="modelOption.value"
                  :label="modelOption.label"
                  :value="modelOption.value"
                >
                  <div class="model-option">
                    <span class="model-label">{{ modelOption.label }}</span>
                    <span class="model-description">{{ modelOption.description }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item :label="`${$t('Temperature')}: ${temperature}`">
              <el-slider
                v-model="temperature"
                :min="0"
                :max="2"
                :step="0.1"
                show-stops
              />
              <template #extra>
                <div class="slider-labels">
                  <small>{{ $t('Focused & Deterministic') }}</small>
                  <small>{{ $t('Creative & Random') }}</small>
                </div>
              </template>
            </el-form-item>

            <el-form-item :label="$t('Max Tokens')">
              <el-input-number
                v-model="maxTokens"
                :min="100"
                :max="4096"
                :step="100"
                size="large"
                class="w-full"
              />
              <template #extra>
                <small class="form-hint">{{ $t('Maximum length of the AI response') }}</small>
              </template>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.ai-agent-form {
  padding-block: 16px;
}

.form-grid {
  margin-inline: auto;
}

.panel-card {
  margin-block-end: 24px;
  border-radius: 16px;
  border: 1px solid var(--el-border-color-lighter);
}

.panel-card.is-collapsed {
  border-color: var(--el-border-color-lighter);
}

.panel-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}

.panel-toggle:focus-visible {
  outline: 2px solid var(--el-color-primary);
  border-radius: 8px;
}

.panel-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.collapse-icon {
  transition: transform 0.2s ease;
  color: var(--el-text-color-secondary);
}

.collapse-icon.is-open {
  transform: rotate(180deg);
}

.panel-icon {
  font-size: 24px;
  color: var(--el-color-primary);
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.panel-header p {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.section-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-description {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.variables-hint {
  margin: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.variable-tag {
  cursor: pointer;
  user-select: none;
}

.section-alert {
  margin-block-end: 12px;
}

.permissions-grid {
  gap: 16px;
}

.flex-item {
  flex: 1;
  min-inline-size: 240px;
}

.recording-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-block: 8px 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.endpoint-box {
  background-color: var(--el-fill-color-light);
  padding: 16px;
  border-radius: 12px;
  border: 1px dashed var(--el-border-color-light);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.endpoint-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.context-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.context-card {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light);
  background-color: var(--el-fill-color-blank);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.context-checkbox {
  margin: 0;
}

.section-spacer {
  margin-block-end: 8px;
}

.model-option {
  display: flex;
  flex-direction: column;
}

.model-label {
  font-weight: 600;
  font-size: 13px;
}

.model-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-block-start: 4px;
}

.w-full {
  width: 100%;
}

.sticky-panel {
  position: sticky;
  top: 16px;
}

@media (max-width: 1024px) {
  .sticky-panel {
    position: static;
  }
}

@media (max-width: 768px) {
  .ai-agent-form {
    padding-inline: 8px;
  }
}
</style>
