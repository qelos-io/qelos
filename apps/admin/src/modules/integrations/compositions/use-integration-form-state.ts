import { nextTick, reactive, ref, watch } from 'vue';
import type { Ref } from 'vue';
import { IIntegration, IDataManipulationStep, IntegrationSourceKind } from '@qelos/global-types';
import { detectIntegrationType, IntegrationType } from '@/modules/integrations/utils/integration-type-detector';

interface UseIntegrationFormStateOptions {
  props: { editingIntegration?: Partial<IIntegration> };
  visible: Ref<boolean>;
  sourcesStore: { result?: any[] };
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

export function useIntegrationFormState({ props, visible, sourcesStore }: UseIntegrationFormStateOptions) {
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
      const detectedType = detectIntegrationType(form, sourcesStore.result);
      setSelectedViewMode(detectedType);
    } else {
      setSelectedViewMode(IntegrationType.Workflow);

      nextTick(() => {
        if (sourcesStore.result?.length) {
          const qelosSourceId = findQelosSource();
          if (qelosSourceId) {
            form.target.source = qelosSourceId;
            form.target.operation = 'webhook';
            form.target.details = {};
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
