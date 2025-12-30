import { nextTick, reactive, ref, toValue, watch } from 'vue';
import type { Ref } from 'vue';
import { IIntegration, IDataManipulationStep, IntegrationSourceKind, QelosTriggerOperation } from '@qelos/global-types';
import { detectIntegrationType, IntegrationType } from '@/modules/integrations/utils/integration-type-detector';

interface UseIntegrationFormStateOptions {
  props: { editingIntegration?: Partial<IIntegration> };
  visible: Ref<boolean>;
  sourcesStore: { result?: any[] };
  isAIAgentMode?: Ref<boolean> | boolean;
  preSelectedSourceId?: Ref<string> | string;
}

const DEFAULT_DATA_MANIPULATION: IDataManipulationStep[] = [
  {
    map: {},
    populate: {
      user: {
        source: 'user'
      },
      workspace: {
        source: 'workspace'
      }
    }
  },
  {
    map: {
      userEmail: '.user.email',
      workspaceMembers: '.workspace.members | map(.user)'
    },
    populate: {}
  },
  {
    map: {},
    populate: {
      workspaceMembers: {
        source: 'user'
      }
    }
  }
];

export function useIntegrationFormState({ 
  props, 
  visible, 
  sourcesStore,
  isAIAgentMode,
  preSelectedSourceId 
}: UseIntegrationFormStateOptions) {
  const form = reactive<Pick<IIntegration, 'trigger' | 'target' | 'dataManipulation' | 'active'>>({
    trigger: {
      source: '',
      operation: '',
      details: {}
    },
    target: {
      source: '',
      operation: '',
      details: {}
    },
    dataManipulation: [...DEFAULT_DATA_MANIPULATION],
    active: false
  });

  const selectedViewMode = ref<IntegrationType>(IntegrationType.Workflow);
  const hasManualViewModeSelection = ref(false);

  const setSelectedViewMode = (mode: IntegrationType, options?: { manual?: boolean }) => {
    selectedViewMode.value = mode;
    if (options?.manual) {
      hasManualViewModeSelection.value = true;
    }
  };

  const findQelosSource = () => {
    if (!sourcesStore.result?.length) return '';
    const qelosSource = sourcesStore.result.find((source) => source.kind === IntegrationSourceKind.Qelos);
    return qelosSource?._id || '';
  };

  const sanitizeDataManipulation = () => {
    form.dataManipulation = (form.dataManipulation || []).map((row: any) => {
      const clone = { ...row };
      delete clone._id;
      return clone;
    });
  };

  const hydrateForm = () => {
    hasManualViewModeSelection.value = false;

    const editingIntegration = props.editingIntegration || {};
    const aiAgentMode = toValue(isAIAgentMode);
    const selectedSourceId = toValue(preSelectedSourceId);

    // Check if editing integration has chat completion operation to force AI agent mode
    const isEditingChatCompletion = editingIntegration.trigger?.operation === QelosTriggerOperation.chatCompletion;

    Object.assign(form, {
      ...editingIntegration,
      trigger: {
        source: '',
        operation: '',
        details: {},
        ...(editingIntegration.trigger || {})
      },
      target: {
        source: '',
        operation: '',
        details: {},
        ...(editingIntegration.target || {})
      },
      dataManipulation: (editingIntegration._id || editingIntegration.dataManipulation?.length)
        ? (editingIntegration.dataManipulation || [])
        : [...DEFAULT_DATA_MANIPULATION],
      active: editingIntegration.active || false
    });

    sanitizeDataManipulation();

    if (editingIntegration._id && sourcesStore.result?.length) {
      // For existing integrations, use AI agent mode if explicitly set or if it's a chat completion
      if (aiAgentMode || isEditingChatCompletion) {
        setSelectedViewMode(IntegrationType.AIAgent);
      } else {
        const detectedType = detectIntegrationType(form, sourcesStore.result);
        setSelectedViewMode(detectedType);
      }
    } else {
      // Set AI agent mode if specified
      if (aiAgentMode) {
        setSelectedViewMode(IntegrationType.AIAgent);
      } else {
        setSelectedViewMode(IntegrationType.Workflow);
      }

      nextTick(() => {
        if (sourcesStore.result?.length) {
          // Use pre-selected source if provided
          if (selectedSourceId) {
            const preSelectedSource = sourcesStore.result.find(s => s._id === selectedSourceId);
            if (preSelectedSource) {
              // For AI agents, set the source as trigger
              if (aiAgentMode) {
                form.trigger.source = selectedSourceId;
                form.trigger.operation = 'chat_completion';
                form.trigger.details = {
                  name: `AI Agent - ${preSelectedSource.name}`,
                  instructions: '',
                  model: preSelectedSource.metadata?.defaultModel || 'gpt-4'
                };
                
                // Set target to Qelos for webhook
                const qelosSourceId = findQelosSource();
                if (qelosSourceId) {
                  form.target.source = qelosSourceId;
                  form.target.operation = 'webhook';
                  form.target.details = {};
                }
              }
            }
          } else {
            // Default behavior: use Qelos source for target
            const qelosSourceId = findQelosSource();
            if (qelosSourceId) {
              form.target.source = qelosSourceId;
              form.target.operation = 'webhook';
              form.target.details = {};
            }
          }
        }
      });
    }
  };

  watch(
    () => [form.trigger, form.target, sourcesStore.result],
    () => {
      if (props.editingIntegration?._id || !sourcesStore.result?.length || hasManualViewModeSelection.value) {
        return;
      }
      // Don't override if AI agent mode is explicitly set
      if (toValue(isAIAgentMode)) {
        return;
      }
      const detectedType = detectIntegrationType(form, sourcesStore.result || []);
      if (detectedType === IntegrationType.AIAgent) {
        setSelectedViewMode(IntegrationType.AIAgent);
      } else {
        setSelectedViewMode(IntegrationType.Workflow);
      }
    },
    { immediate: true, deep: true }
  );

  watch(
    visible,
    (value) => {
      if (value) {
        hydrateForm();
      }
    },
    { immediate: true }
  );

  return {
    form,
    selectedViewMode,
    setSelectedViewMode
  };
}
