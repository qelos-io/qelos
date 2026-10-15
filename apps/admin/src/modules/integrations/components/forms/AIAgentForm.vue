<script setup lang="ts">
import { computed, watch, watchEffect, ref, onMounted } from 'vue';
import { claudeModelSupportsSamplingParams, DEFAULT_AI_MODEL_BY_PROVIDER, modelSupportsSamplingParams, IIntegration, IntegrationSourceKind, QelosTriggerOperation, OpenAITargetOperation } from '@qelos/global-types';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { storeToRefs } from 'pinia';
import { ArrowDown } from '@element-plus/icons-vue';
import FunctionToolsTab from '@/modules/integrations/components/tabs/FunctionToolsTab.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import WorkspaceLabelSelector from '@/modules/no-code/components/WorkspaceLabelSelector.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import { ElMessage } from 'element-plus';
import { getPlural } from '@/modules/core/utils/texts';
import { getMaxTokensForModel, getModelsByProvider, getProviderFromSourceKind } from '@/modules/integrations/constants/ai-models';
import AiPromptButton from '@/modules/admins/components/AiPromptButton.vue';

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

const PANEL_IDS = ['rolesIdentity', 'advanced', 'systemPrompt', 'connections', 'capabilities'] as const;
type PanelId = typeof PANEL_IDS[number];

const isEditMode = computed(() => Boolean(props.integrationId));
// the agent is set up one section at a time; a section's state shows in the list on the left
const activePanel = ref<PanelId>('rolesIdentity');
watch(() => props.integrationId, () => (activePanel.value = 'rolesIdentity'), { immediate: true });

const isPanelOpen = (panel: PanelId) => activePanel.value === panel;
const togglePanel = (panel: PanelId) => (activePanel.value = panel);

const PANEL_TITLES: Record<PanelId, string> = {
  rolesIdentity: 'Roles & Identity',
  advanced: 'Advanced AI Settings',
  systemPrompt: 'System Prompt & Context',
  connections: 'Connections & Tools',
  capabilities: 'Agent Capabilities',
};
const railTitle = (panel: PanelId) => PANEL_TITLES[panel];
const railNeighbor = (direction: 1 | -1): PanelId | null => PANEL_IDS[PANEL_IDS.indexOf(activePanel.value) + direction] ?? null;

// Find Qelos and OpenAI sources
const qelosSource = computed(() => {
  return store.result?.find(s => s.kind === IntegrationSourceKind.Qelos);
});

const openAISources = computed(() => {
  return store.result?.filter(s => s.kind === IntegrationSourceKind.OpenAI) || [];
});

const geminiSources = computed(() => {
  return store.result?.filter(s => s.kind === IntegrationSourceKind.Gemini) || [];
});

const claudeSources = computed(() => {
  return store.result?.filter(s => s.kind === IntegrationSourceKind.ClaudeAi) || [];
});

const allAISources = computed(() => {
  return [
    ...openAISources.value,
    ...geminiSources.value,
    ...claudeSources.value
  ];
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

const vectorStore = computed({
  get: () => trigger.value?.details?.vectorStore || false,
  set: (value: boolean) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    trigger.value.details = {
      ...trigger.value.details,
      vectorStore: value
    };
  }
});

const vectorStoreScope = computed({
  get: () => trigger.value?.details?.vectorStoreScope || 'thread',
  set: (value: string) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    trigger.value.details = {
      ...trigger.value.details,
      vectorStoreScope: value
    };
  }
});

const vectorStoreExpirationDays = computed({
  get: () => trigger.value?.details?.vectorStoreExpirationDays ?? 14,
  set: (value: number | undefined) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    trigger.value.details = {
      ...trigger.value.details,
      vectorStoreExpirationDays: value
    };
  }
});

const vectorStoreHardcodedIds = computed({
  get: () => trigger.value?.details?.vectorStoreHardcodedIds?.join('\n') || '',
  set: (value: string) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    const ids = value.split('\n').map(id => id.trim()).filter(id => id.length > 0);
    trigger.value.details = {
      ...trigger.value.details,
      vectorStoreHardcodedIds: ids
    };
  }
});

const codeInterpreter = computed({
  get: () => trigger.value?.details?.codeInterpreter || false,
  set: (value: boolean) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    trigger.value.details = {
      ...trigger.value.details,
      codeInterpreter: value
    };
  }
});

const webSearch = computed({
  get: () => trigger.value?.details?.webSearch || false,
  set: (value: boolean) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    trigger.value.details = {
      ...trigger.value.details,
      webSearch: value
    };
  }
});

const allowRules = computed({
  get: () => trigger.value?.details?.rules || false,
  set: (value: boolean) => {
    if (!trigger.value) {
      trigger.value = { source: '', operation: '', details: {} };
    }
    trigger.value.details = {
      ...trigger.value.details,
      rules: value
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

const selectedAISource = computed({
  get: () => target.value?.source || '',
  set: (value: string) => {
    if (!target.value) {
      target.value = {
        source: value,
        operation: OpenAITargetOperation.chatCompletion,
        details: {}
      };
    } else {
      target.value.source = value;
      // Always ensure the operation is set to chat completion for AI agents
      target.value.operation = OpenAITargetOperation.chatCompletion;
    }
  }
});

// Get the current source to determine provider
const currentAISource = computed(() => {
  return allAISources.value.find(source => source._id === selectedAISource.value);
});

// Get current provider type
const currentProvider = computed(() => {
  if (!currentAISource.value) return null;
  return getProviderFromSourceKind(currentAISource.value.kind);
});

/** vector store, web search and the code interpreter are OpenAI features; with no provider chosen yet they stay available */
const supportsOpenAITools = computed(() => !currentProvider.value || currentProvider.value === 'openai');

const defaultModelForProvider = computed(() => {
  if (currentProvider.value) {
    return DEFAULT_AI_MODEL_BY_PROVIDER[currentProvider.value];
  }
  return DEFAULT_AI_MODEL_BY_PROVIDER.openai;
});

const availableModels = computed(() => {
  if (!currentProvider.value) return [];
  const curated = getModelsByProvider(currentProvider.value).map(model => ({
    label: model.label,
    value: model.value || model.identifier,
    description: model.description || ''
  }));

  const savedModel = target.value?.details?.model?.trim();
  if (savedModel && !curated.some(option => option.value === savedModel)) {
    return [
      ...curated,
      { label: savedModel, value: savedModel, description: '' }
    ];
  }

  return curated;
});

const model = computed({
  get: () => target.value?.details?.model || defaultModelForProvider.value,
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

const supportsSamplingParams = computed(() => {
  if (currentProvider.value === 'claude') return claudeModelSupportsSamplingParams(model.value);
  return modelSupportsSamplingParams(model.value);
});

const maxTokens = computed({
  get: () => target.value?.details?.max_tokens || 10000,
  set: (value: number) => {
    if (!target.value?.details) return;
    target.value.details.max_tokens = value;
  }
});

const responseFormat = computed({
  get: () => target.value?.details?.response_format,
  set: (value: any) => {
    if (!target.value?.details) return;
    target.value.details.response_format = value;
  }
});

// Dynamic max tokens based on selected model
const maxTokensLimit = computed(() => {
  const selectedModel = target.value?.details?.model || defaultModelForProvider.value;
  return getMaxTokensForModel(selectedModel);
});

const systemMessage = computed({
  get: () => target.value?.details?.system_message || target.value?.details?.pre_messages?.find(msg => msg.role === 'system')?.content || '',
  set: (value: string) => {
    if (!target.value?.details) return;
    if (!target.value.details.pre_messages) {
      target.value.details.pre_messages = [];
    }
    const systemMsgIndex = target.value.details.pre_messages.findIndex(msg => msg.role === 'system');
    if (value) {
      if (systemMsgIndex >= 0) {
        target.value.details.pre_messages[systemMsgIndex].content = value;
      } else {
        target.value.details.pre_messages.push({
          role: 'system',
          content: value
        });
      }
    } else if (systemMsgIndex >= 0) {
      target.value.details.pre_messages.splice(systemMsgIndex, 1);
    }
    target.value.details.system_message = value;
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
  
  if (!newTarget?.source && allAISources.value.length > 0) {
    target.value = {
      source: allAISources.value[0]._id || '',
      operation: OpenAITargetOperation.chatCompletion,
      details: newTarget?.details || {}
    };
  }
  
  // For new agents (no integrationId), always ensure target operation is chat completion
  if (!props.integrationId && target.value) {
    target.value.operation = OpenAITargetOperation.chatCompletion;
  }
}, { immediate: true, deep: true });

onMounted(() => {
  const sources = allAISources.value;
  if (!isEditMode.value && sources.length > 0) {
    target.value = {
      ...target.value,
      source: sources[0]._id || ''
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

// AI generation functions
const agentSchema = computed(() => {
  const properties: Record<string, unknown> = {
    name: { type: "string", description: "A clear, concise name for the agent" },
    system_message: { type: "string", description: "The system prompt defining the agent's role, tone, and responsibilities" },
    model: { type: "string", description: "The AI model to use (e.g., gpt-6.1-sol, claude-sonnet-5-5, gemini-3.8-flash)" },
    maxTokens: { type: "number", description: "Maximum tokens for the response (e.g., 4096, 8192, 16384)" },
    recordThread: { type: "boolean", description: "Whether to record conversation threads" },
    vectorStore: { type: "boolean", description: "Whether to create a vector store for the thread" },
    webSearch: { type: "boolean", description: "Whether to enable web search capability" },
    codeInterpreter: { type: "boolean", description: "Whether to enable code interpreter capability (OpenAI only)" },
    allowRules: { type: "boolean", description: "Whether to allow clients to pass custom rules as system messages" },
    vectorStoreScope: { type: "string", description: "Scope of the vector store (thread, user, workspace, tenant)" },
    vectorStoreExpirationDays: { type: "number", description: "Number of days after last activity before the vector store expires" },
    vectorStoreHardcodedIds: { type: "array", items: { type: "string" }, description: "Additional OpenAI vector store IDs to include in file search" },
    includeUserContext: { type: "boolean", description: "Whether to include user information in context" },
    includeWorkspaceContext: { type: "boolean", description: "Whether to include workspace information in context" },
    permissions: {
      type: "object",
      properties: {
        canReadFiles: { type: "boolean", description: "Can read uploaded files" },
        canBrowseWeb: { type: "boolean", description: "Can browse the web" },
        canExecuteCode: { type: "boolean", description: "Can execute code snippets" },
        canAccessApis: { type: "boolean", description: "Can make API calls" }
      }
    }
  };

  if (supportsSamplingParams.value) {
    properties.temperature = { type: "number", description: "Controls randomness (0.0-2.0, lower = more focused)" };
  }

  return {
    type: "object",
    properties,
    required: ["name", "system_message"]
  };
});

const getAgentPrompt = async () => {
  return {
    prompt: `Based on the following description, generate a complete AI agent configuration:\n\nDescription: ${agentDescription.value}\n\nGenerate appropriate values for the agent configuration. Consider:\n1. A suitable AI model (use gpt-6.1-sol for complex tasks, gpt-6-luna for general use, claude-sonnet-5-5 for nuanced reasoning, or gemini-3.8-flash for multimodal tasks)\n2. Appropriate max tokens (4096 for simple responses, 8192+ for detailed analysis)\n3. Temperature setting (0.7 for creative tasks, 0.3-0.5 for analytical tasks)\n4. Relevant permissions based on the agent's purpose\n\nThe system message should be detailed and professional, defining the agent's role, tone, and specific responsibilities.`,
    schema: agentSchema.value
  };
};

const handleAiGeneratedAgent = (result: any) => {
  // Update agent name
  if (result.name) {
    agentName.value = result.name;
  }
  
  // Update system message
  if (result.system_message) {
    systemMessage.value = result.system_message;
  }
  
  // Update model if it exists
  if (result.model && target.value?.details) {
    target.value.details.model = result.model;
  }
  
  // Update max tokens if it exists
  if (result.maxTokens && target.value?.details) {
    target.value.details.max_tokens = result.maxTokens;
  }
  
  // Update temperature if it exists
  if (result.temperature !== undefined && target.value?.details) {
    target.value.details.temperature = result.temperature;
  }
  
  // Update recording option
  if (typeof result.recordThread === 'boolean') {
    recordThread.value = result.recordThread;
  }
  
  // Update vector store option
  if (typeof result.vectorStore === 'boolean') {
    vectorStore.value = result.vectorStore;
  }
  
  // Update web search option
  if (typeof result.webSearch === 'boolean') {
    webSearch.value = result.webSearch;
  }
  
  // Update vector store scope
  if (result.vectorStoreScope) {
    vectorStoreScope.value = result.vectorStoreScope;
  }
  
  // Update vector store expiration days
  if (typeof result.vectorStoreExpirationDays === 'number') {
    vectorStoreExpirationDays.value = result.vectorStoreExpirationDays;
  }
  
  // Update vector store hardcoded IDs
  if (Array.isArray(result.vectorStoreHardcodedIds)) {
    vectorStoreHardcodedIds.value = result.vectorStoreHardcodedIds.join('\n');
  }

  // Update code interpreter option
  if (typeof result.codeInterpreter === 'boolean') {
    codeInterpreter.value = result.codeInterpreter;
  }

  // Update allow rules option
  if (typeof result.allowRules === 'boolean') {
    allowRules.value = result.allowRules;
  }

  // Update context options
  if (typeof result.includeUserContext === 'boolean') {
    includeUserContext.value = result.includeUserContext;
  }
  
  if (typeof result.includeWorkspaceContext === 'boolean') {
    includeWorkspaceContext.value = result.includeWorkspaceContext;
  }
  
  // Update permissions if they exist
  if (result.permissions && target.value?.details) {
    target.value.details.permissions = result.permissions;
  }
  
  ElMessage.success('Agent configuration generated successfully');
};

const handleAiError = (error: any) => {
  ElMessage.error('Failed to generate agent configuration');
};

// System prompt improvement functions
const systemPromptSchema = {
  type: "object",
  properties: {
    improved_system_message: { 
      type: "string", 
      description: "An improved version of the system prompt that is more clear, specific, and effective" 
    }
  },
  required: ["improved_system_message"]
};

const getSystemPromptImprover = async () => {
  return {
    prompt: `Improve the following system prompt to make it more effective, clear, and professional. The improved prompt should:
1. Be more specific about the agent's role and responsibilities
2. Include clear guidelines on tone and communication style
3. Provide specific instructions for handling different scenarios
4. Be more concise while retaining all essential information
5. Include best practices for the agent's domain

Current system prompt:
"""
${systemMessage.value}
"""

Agent description for context:
"""
${agentDescription.value || 'No description provided'}
"""

Return only the improved system message without any additional explanation.`,
    schema: systemPromptSchema
  };
};

const handleSystemPromptImproved = (result: any) => {
  if (result.improved_system_message) {
    systemMessage.value = result.improved_system_message;
    ElMessage.success('System prompt improved successfully');
  }
};

const railSteps = computed(() =>
  PANEL_IDS.map((id) => {
    let state: 'done' | 'todo' | 'empty' = 'empty';
    let summary = '';
    let summaryIsKey = false;
    if (id === 'rolesIdentity') {
      state = agentName.value ? 'done' : 'todo';
      summary = agentName.value || 'Name your agent';
      summaryIsKey = !agentName.value;
    } else if (id === 'advanced') {
      const source = allAISources.value.find((entry) => entry._id === (target.value?.source || ''));
      state = source ? 'done' : 'todo';
      summary = source ? `${source.name}${(trigger.value?.details as any)?.model ? ' · ' + (trigger.value?.details as any).model : ''}` : 'Choose an AI connection';
      summaryIsKey = !source;
    }
    return { id, title: PANEL_TITLES[id], state, summary, summaryIsKey };
  }),
);
</script>

<template>
  <div class="ai-agent-form">
    <div class="agent-layout">
      <nav class="agent-rail" :aria-label="$t('Agent setup')">
        <ol>
          <li v-for="(step, index) in railSteps" :key="step.id">
            <button type="button" class="rail-step" :class="[`state-${step.state}`, { active: step.id === activePanel }]" :aria-current="step.id === activePanel ? 'step' : undefined" @click="activePanel = step.id">
              <span class="rail-marker" aria-hidden="true"><font-awesome-icon v-if="step.state === 'done'" :icon="['fas', 'check']" /><font-awesome-icon v-else-if="step.state === 'todo'" :icon="['fas', 'exclamation']" /><template v-else>{{ index + 1 }}</template></span>
              <span class="rail-label"><span class="rail-title">{{ $t(step.title) }}</span><span class="rail-sub" dir="auto">{{ step.summaryIsKey ? $t(step.summary) : step.summary }}</span></span>
            </button>
          </li>
        </ol>
      </nav>
      <div class="agent-panels">
      <div class="agent-main">
        <section class="panel" v-show="isPanelOpen('rolesIdentity')">
          <header class="panel-head"><h2>{{ $t('Roles & Identity') }}</h2><p>{{ $t('Control who can talk to this agent and how it identifies itself.') }}</p></header>

          <section v-show="isPanelOpen('rolesIdentity')" class="section-block">
            <div class="section-title">{{ $t('Roles & Permissions') }}</div>
            <p class="section-description">
              {{ $t('Define user, workspace, or label-based rules to trigger the agent.') }}
            </p>

            <div class="permissions-grid">
              <el-form-item class="flex-item">
                <template #label>{{ $t('Guest Access') }}</template>
                <el-switch v-model="guestAllowed" />
                <p class="field-hint">{{ $t('Allow unauthenticated visitors to start conversations.') }}</p>
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
            </div>
          </section>

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

            <el-form-item>
              <template #label>
                <div class="form-item-with-button">
                  <span>{{ $t('Agent Description') }}</span>
                  <AiPromptButton
                    size="small"
                    :disabled="!agentDescription"
                    :prompt="getAgentPrompt"
                    :schema="agentSchema"
                    @result="handleAiGeneratedAgent"
                    @error="handleAiError"
                  />
                </div>
              </template>
              <el-input
                v-model="agentDescription"
                type="textarea"
                :rows="3"
                :placeholder="$t('Describe what this agent does...')"
              />
            </el-form-item>
          </section>
        </section>

        <section class="panel" v-show="isPanelOpen('capabilities')">
          <header class="panel-head"><h2>{{ $t('Agent Capabilities') }}</h2><p>{{ $t('Configure recording, vector store, and web search capabilities.') }}</p></header>

          <section v-show="isPanelOpen('capabilities')" class="section-block">
            <div v-if="props.integrationId" class="endpoint-box">
              <div class="endpoint-title"><span>{{ $t('Agent Endpoint') }}</span></div>
              <el-input :value="completionUrl" readonly dir="ltr">
                <template #append>
                  <el-button @click="copyCompletionUrl">
                    {{ $t('Copy') }}
                  </el-button>
                </template>
              </el-input>
            </div>

            <ul class="caps">
              <li>
                <div class="cap-text"><strong>{{ $t('Record conversation threads') }}</strong><p>{{ $t('Maintains conversation context across multiple messages. Requires thread identifier in API.') }}</p></div>
                <el-switch v-model="recordThread" :aria-label="$t('Record conversation threads')" />
              </li>
              <li :class="{ unavailable: !supportsOpenAITools }">
                <div class="cap-text"><strong>{{ $t('Enable vector store') }}</strong><p>{{ $t('Creates a vector store for file search capabilities. Allows agent to search through uploaded documents.') }}</p><span v-if="!supportsOpenAITools" class="cap-note">{{ $t('Needs an OpenAI provider') }}</span></div>
                <el-switch v-model="vectorStore" :disabled="!supportsOpenAITools" :aria-label="$t('Enable vector store')" />
              </li>
              <li :class="{ unavailable: !supportsOpenAITools }">
                <div class="cap-text"><strong>{{ $t('Enable web search') }}</strong><p>{{ $t('Agent can search the web for current information and real-time data.') }}</p><span v-if="!supportsOpenAITools" class="cap-note">{{ $t('Needs an OpenAI provider') }}</span></div>
                <el-switch v-model="webSearch" :disabled="!supportsOpenAITools" :aria-label="$t('Enable web search')" />
              </li>
              <li :class="{ unavailable: !supportsOpenAITools }">
                <div class="cap-text"><strong>{{ $t('Enable code interpreter') }}</strong><p>{{ $t('Agent can execute code in a sandboxed environment for data analysis, computation, and file processing.') }}</p><span v-if="!supportsOpenAITools" class="cap-note">{{ $t('Needs an OpenAI provider') }}</span></div>
                <el-switch v-model="codeInterpreter" :disabled="!supportsOpenAITools" :aria-label="$t('Enable code interpreter')" />
              </li>
              <li>
                <div class="cap-text"><strong>{{ $t('Allow rules') }}</strong><p>{{ $t('Allows clients to pass custom rules that are injected as system messages. Rules guide the agent\'s behavior and enforce conventions.') }}</p></div>
                <el-switch v-model="allowRules" :aria-label="$t('Allow rules')" />
              </li>
            </ul>

            <template v-if="vectorStore">
              <div class="section-title">{{ $t('Vector Store Configuration') }}</div>
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item :label="$t('Vector store scope')">
                    <el-select v-model="vectorStoreScope" :placeholder="$t('Select scope')">
                      <el-option label="Thread" value="thread" />
                      <el-option label="User" value="user" />
                      <el-option label="Workspace" value="workspace" />
                      <el-option label="Tenant" value="tenant" />
                    </el-select>
                    <div class="form-help-text">
                      {{ $t('Thread: unique store per thread. User: shared across user\'s threads. Workspace: shared across workspace. Tenant: shared across all users.') }}
                    </div>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item :label="$t('Expiration after days')">
                    <el-input-number
                      v-model="vectorStoreExpirationDays"
                      :min="1"
                      :max="365"
                      :placeholder="$t('Days until expiration')"
                    />
                    <div class="form-help-text">
                      {{ $t('Number of days after last activity before the vector store expires. Leave empty for no expiration.') }}
                    </div>
                  </el-form-item>
                </el-col>
              </el-row>
              <el-row>
                <el-col :span="24">
                  <el-form-item :label="$t('Additional vector store IDs')">
                    <el-input
                      v-model="vectorStoreHardcodedIds"
                      type="textarea"
                      :rows="3"
                      :placeholder="$t('Enter vector store IDs, one per line')"
                    />
                    <div class="form-help-text">
                      {{ $t('Additional OpenAI vector store IDs to include in file search. Enter one ID per line.') }}
                    </div>
                  </el-form-item>
                </el-col>
              </el-row>
            </template>
          </section>
        </section>

        <section class="panel" v-show="isPanelOpen('systemPrompt')">
          <header class="panel-head"><h2>{{ $t('System Prompt & Context') }}</h2><p>{{ $t('Craft the system behavior and decide what context is injected.') }}</p></header>

          <section v-show="isPanelOpen('systemPrompt')" class="section-block">
            <div class="section-title">{{ $t('System Prompt') }}</div>
            <p class="section-description">
              {{ $t('Define the role, tone, and responsibilities of the agent.') }}
            </p>
            <div class="variables-hint">
              {{ $t('Available variables') }}:
              <button v-for="key in systemMessageVariables" :key="key" type="button" class="variable-chip" :title="$t('Copy')" @click="copyVariableToClipboard(key)">{{ getVariableTemplate(key) }}</button>
            </div>
            <div class="form-item-with-button">
              <span>{{ $t('System Prompt') }}</span>
              <AiPromptButton
                size="small"
                :disabled="!systemMessage"
                :prompt="getSystemPromptImprover"
                :schema="systemPromptSchema"
                @result="handleSystemPromptImproved"
                @error="handleAiError"
              />
            </div>
            <el-input
              v-model="systemMessage"
              type="textarea"
              :rows="8"
              :placeholder="$t('You are a helpful assistant that...')"
            />
          </section>

          <section v-show="isPanelOpen('systemPrompt')" class="section-block">
            <div class="section-title">{{ $t('Context Sources') }}</div>
            <p class="section-description">
              {{ $t('Select user, workspace, and blueprint data to provide richer answers.') }}
            </p>

            <div class="context-grid">
              <div class="context-card">
                <div class="card-heading">
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
        </section>

        <section class="panel" v-show="isPanelOpen('connections')">
          <header class="panel-head"><h2>{{ $t('Connections & Tools') }}</h2><p>{{ $t('Decide which blueprints, agents, and functions this agent can call.') }}</p></header>

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
        </section>
      </div>

      <div class="agent-main">
        <section class="panel" v-show="isPanelOpen('advanced')">
          <header class="panel-head"><h2>{{ $t('Advanced AI Settings') }}</h2><p>{{ $t('Model, provider, and response controls.') }}</p></header>

          <el-form label-position="top" class="advanced-form" @submit.prevent>
            <el-form-item :label="$t('AI Provider Source')" required>
              <el-select
                v-model="selectedAISource"
                :placeholder="$t('Select AI provider connection')"
                size="large"
                class="w-full"
              >
                <el-option-group
                  v-if="openAISources.length > 0"
                  :label="$t('OpenAI')"
                >
                  <el-option
                    v-for="source in openAISources"
                    :key="source._id"
                    :label="source.name"
                    :value="source._id"
                  />
                </el-option-group>
                <el-option-group
                  v-if="geminiSources.length > 0"
                  :label="$t('Google Gemini')"
                >
                  <el-option
                    v-for="source in geminiSources"
                    :key="source._id"
                    :label="source.name"
                    :value="source._id"
                  />
                </el-option-group>
                <el-option-group
                  v-if="claudeSources.length > 0"
                  :label="$t('Anthropic Claude')"
                >
                  <el-option
                    v-for="source in claudeSources"
                    :key="source._id"
                    :label="source.name"
                    :value="source._id"
                  />
                </el-option-group>
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

            <el-form-item v-if="supportsSamplingParams" :label="`${$t('Temperature')}: ${temperature}`">
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

            <el-alert
              v-if="!supportsSamplingParams"
              type="info"
              :closable="false"
              show-icon
            >
              {{ $t('Temperature and top_p are not supported for this model. Use prompting to control response style instead.') }}
            </el-alert>

            <el-form-item :label="$t('Max Tokens')">
              <el-input-number
                v-model="maxTokens"
                :min="100"
                :max="maxTokensLimit"
                :step="100"
                size="large"
                class="w-full"
              />
              <template #extra>
                <small class="form-hint">{{ $t('Maximum length of the AI response (up to {max})', { max: maxTokensLimit }) }}</small>
              </template>
            </el-form-item>

            <!-- Response Format -->
            <el-form-item>
              <template #label>{{ $t('Response Format') }}</template>
              <el-select
                v-model="responseFormat"
                value-key="type"
                :placeholder="$t('Default (no format constraint)')"
                clearable
                size="large"
                class="w-full"
              >
                <el-option
                  :label="$t('JSON Object')"
                  :value="{ type: 'json_object' }"
                />
              </el-select>
              <template #extra>
                <p class="field-hint">{{ responseFormat?.type === 'json_object' ? $t('When using JSON mode, you must instruct the model to produce JSON in your system message or user prompt.') : $t('Constrains the model output to a specific format. JSON mode ensures valid JSON output.') }}</p>
              </template>
            </el-form-item>
          </el-form>
        </section>
      </div>
        <footer class="agent-foot">
          <el-button v-if="railNeighbor(-1)" text @click="activePanel = railNeighbor(-1)!">{{ $t(railTitle(railNeighbor(-1)!)) }}</el-button>
          <span class="grow" />
          <el-button v-if="railNeighbor(1)" type="primary" plain @click="activePanel = railNeighbor(1)!">{{ $t(railTitle(railNeighbor(1)!)) }}</el-button>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.agent-layout {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}

.agent-rail {
  position: sticky;
  inset-block-start: 12px;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);

  ol {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
}

.rail-step {
  display: flex;
  align-items: center;
  gap: 10px;
  inline-size: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: calc(var(--border-radius, 6px) + 1px);
  background: transparent;
  color: var(--el-text-color-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-lighter);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }

  &.active {
    background: var(--el-color-primary-light-9);
  }
}

.rail-marker {
  display: grid;
  flex: none;
  place-items: center;
  inline-size: 26px;
  block-size: 26px;
  border: 1px solid var(--el-border-color);
  border-radius: 50%;
  color: var(--el-text-color-secondary);
  font-size: 0.78rem;
  font-weight: 700;
}

.state-done .rail-marker {
  border-color: var(--el-color-success);
  background: var(--el-color-success);
  color: #fff;
}

.state-todo .rail-marker {
  border-color: var(--el-color-danger);
  background: var(--el-color-danger);
  color: #fff;
}

.rail-label {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.rail-title {
  font-size: 0.92rem;
  font-weight: 600;
}

.rail-sub {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-todo .rail-sub {
  color: var(--el-color-danger);
}

.agent-panels {
  min-inline-size: 0;
}

.agent-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-block: 4px;

  .grow {
    flex: 1;
  }
}

@media (max-width: 1023px) {
  .agent-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .agent-rail {
    position: static;
    padding: 6px;
    overflow-x: auto;

    ol {
      flex-direction: row;
      gap: 4px;
    }
  }

  .rail-step {
    inline-size: auto;
    white-space: nowrap;
  }

  .rail-sub {
    display: none;
  }
}

.ai-agent-form {
  padding-block: 16px;
}

.form-grid {
  margin-inline: auto;
}











.section-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 1rem;
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



.permissions-grid {
  gap: 16px;
}

.flex-item {
  flex: 1;
  min-inline-size: 240px;
}

/* Agent Capabilities Card Styles */








.recording-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-block: 8px 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}



.context-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
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

.form-help-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

.recording-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  line-height: 1.4;
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

.form-item-with-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.form-item-with-button .ai-prompt-button {
  margin-left: 12px;
  flex-shrink: 0;
}

.form-item-with-button .ai-prompt-button .el-select {
  width: 120px !important;
}

.form-item-with-button .ai-prompt-button .el-button {
  padding: 4px 8px;
  font-size: 12px;
}

.form-item-with-button .ai-prompt-button .el-button .el-icon {
  font-size: 12px;
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

.panel {
  margin-block-end: 28px;
}

.panel-head {
  margin-block-end: 20px;
  padding-block-end: 14px;
  border-block-end: 1px solid var(--el-border-color-lighter);

  h2 {
    margin: 0;
    padding: 0;
    font-size: 1.15rem;
    font-weight: 600;
    line-height: 1.3;
  }

  p {
    margin: 2px 0 0;
    padding: 0;
    color: var(--el-text-color-secondary);
    font-size: 0.88rem;
    text-align: start;
  }
}

.section-block {
  margin-block-end: 32px;

  &:last-child {
    margin-block-end: 0;
  }
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 16px;
}

.field-hint {
  margin: 4px 0 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  line-height: 1.4;
  text-align: start;
}

.caps {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding-block: 14px;
    border-block-end: 1px solid var(--el-border-color-extra-light);

    &:first-child {
      padding-block-start: 0;
    }

    &:last-child {
      border-block-end: 0;
    }

    &.unavailable .cap-text {
      opacity: 0.6;
    }
  }
}

.cap-text {
  min-inline-size: 0;

  strong {
    font-weight: 600;
  }

  p {
    margin: 2px 0 0;
    padding: 0;
    max-inline-size: 62ch;
    color: var(--el-text-color-secondary);
    font-size: 0.86rem;
    line-height: 1.45;
    text-align: start;
  }
}

.cap-note {
  display: inline-block;
  margin-block-start: 4px;
  color: var(--el-color-warning-dark-2, var(--el-color-warning));
  font-size: 0.8rem;
}

.endpoint-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-block-end: 28px;
}

.endpoint-title {
  font-weight: 600;
}

.variables-hint {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.variable-chip {
  padding: 2px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--el-text-color-regular);
  font-family: var(--el-font-family-mono, ui-monospace, monospace);
  font-size: 0.8rem;
  cursor: pointer;

  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.context-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.context-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-heading {
  font-weight: 600;
}

.advanced-form {
  max-inline-size: 640px;
}

@media (max-width: 820px) {
  .permissions-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
