<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import TriggerTab from '@/modules/integrations/components/tabs/TriggerTab.vue';
import DataManipulationTab from '@/modules/integrations/components/tabs/DataManipulationTab.vue';
import TargetTab from '@/modules/integrations/components/tabs/TargetTab.vue';
import TriggerResponseTab from '@/modules/integrations/components/tabs/TriggerResponseTab.vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { 
  ArrowRight, 
  Check, 
  Warning, 
  Close, 
  Setting, 
  View, 
  ArrowDown,
  Connection,
  DataAnalysis,
  Promotion,
  Position
} from '@element-plus/icons-vue';

const trigger = defineModel<any>('trigger', { required: true });
const target = defineModel<any>('target', { required: true });
const dataManipulation = defineModel<any>('dataManipulation', { required: true });

const props = defineProps<{ integrationId?: string }>();

const router = useRouter();
const integrationsStore = useIntegrationsStore();
const sourcesStore = useIntegrationSourcesStore();

const sourcesById = computed(() => {
  if (!sourcesStore.result) return {} as Record<string, any>;
  return sourcesStore.result.reduce((acc, source) => {
    acc[source._id] = source;
    return acc;
  }, {} as Record<string, any>);
});

const triggerDetails = computed(() => trigger.value?.details || {});

const triggerSignature = computed(() => ({
  source: triggerDetails.value.source || '',
  kind: triggerDetails.value.kind || '',
  eventName: triggerDetails.value.eventName || ''
}));

const hasTriggerSignature = computed(() =>
  Boolean(triggerSignature.value.source && triggerSignature.value.kind && triggerSignature.value.eventName)
);

const upstreamIntegrations = computed(() => {
  if (!hasTriggerSignature.value) return [];
  return (integrationsStore.integrations || []).filter((integration) => {
    if (integration._id === props.integrationId) return false;
    const response = integration.target?.details?.triggerResponse;
    if (!response) return false;
    return (
      response.source === triggerSignature.value.source &&
      response.kind === triggerSignature.value.kind &&
      response.eventName === triggerSignature.value.eventName
    );
  });
});

const triggerResponseConfig = computed(() => target.value?.details?.triggerResponse);

const hasTriggerResponseSignature = computed(() =>
  Boolean(
    triggerResponseConfig.value?.source &&
    triggerResponseConfig.value?.kind &&
    triggerResponseConfig.value?.eventName
  )
);

const downstreamIntegrations = computed(() => {
  if (!hasTriggerResponseSignature.value) return [];
  return (integrationsStore.integrations || []).filter((integration) => {
    if (integration._id === props.integrationId) return false;
    const details = integration.trigger?.details || {};
    return (
      details.source === triggerResponseConfig.value?.source &&
      details.kind === triggerResponseConfig.value?.kind &&
      details.eventName === triggerResponseConfig.value?.eventName
    );
  });
});

// Workflow step state management
const expandedSteps = ref(new Set(['trigger'])); // Start with trigger expanded
const workflowSteps = ref([
  { id: 'upstream', title: 'Incoming Signals', icon: 'Connection', optional: true },
  { id: 'trigger', title: 'Trigger', icon: 'Promotion', required: true },
  { id: 'data-manipulation', title: 'Data Manipulation', icon: 'DataAnalysis', optional: true },
  { id: 'target', title: 'Target', icon: 'Position', required: true },
  { id: 'trigger-response', title: 'Trigger Response', icon: 'ArrowRight', optional: true },
  { id: 'downstream', title: 'Downstream Automations', icon: 'Connection', optional: true }
]);

const toggleStep = (stepId: string) => {
  if (expandedSteps.value.has(stepId)) {
    expandedSteps.value.delete(stepId);
  } else {
    expandedSteps.value.add(stepId);
  }
};

const isStepExpanded = (stepId: string) => expandedSteps.value.has(stepId);

// Step validation and status
const getStepStatus = (stepId: string) => {
  switch (stepId) {
    case 'upstream':
      return hasTriggerSignature.value ? (upstreamIntegrations.value.length > 0 ? 'success' : 'warning') : 'inactive';
    case 'trigger':
      return trigger.value?.source && trigger.value?.details ? 'success' : 'error';
    case 'data-manipulation':
      return dataManipulation.value?.length > 0 ? 'success' : 'inactive';
    case 'target':
      return target.value?.source && target.value?.details ? 'success' : 'error';
    case 'trigger-response':
      return hasTriggerResponseSignature.value ? 'success' : 'inactive';
    case 'downstream':
      return hasTriggerResponseSignature.value ? (downstreamIntegrations.value.length > 0 ? 'success' : 'warning') : 'inactive';
    default:
      return 'inactive';
  }
};

const getStepIcon = (stepId: string, status: string) => {
  if (status === 'success') return Check;
  if (status === 'error') return Close;
  if (status === 'warning') return Warning;
  return Setting;
};

const navigateToIntegration = (integrationId: string) => {
  router.push({ query: { mode: 'edit', id: integrationId } });
};

const renderIntegrationName = (integration: any) => (
  integration.trigger?.details?.name ||
  sourcesById.value[integration.trigger?.source]?.name ||
  'Unnamed integration'
);

const renderIntegrationSummary = (integration: any) => (
  integration.trigger?.details?.description ||
  sourcesById.value[integration.target?.source]?.name ||
  ''
);

// Workflow overview state
const showMinimap = ref(false);
const workflowProgress = computed(() => {
  const requiredSteps = workflowSteps.value.filter(step => step.required);
  const completedRequired = requiredSteps.filter(step => getStepStatus(step.id) === 'success').length;
  return Math.round((completedRequired / requiredSteps.length) * 100);
});
</script>

<template>
  <div class="workflow-view">
    <section class="workflow-stage">
      <header class="stage-header">
        <div class="stage-index">0</div>
        <div>
          <h3>{{ $t('Incoming signals') }}</h3>
          <p>{{ $t('Integrations that emit events matching this trigger.') }}</p>
        </div>
      </header>
      <div class="stage-body">
        <el-alert type="info" :closable="false" class="mb-3">
          {{ $t('Define the trigger source, kind and event to discover upstream automations.') }}
        </el-alert>
        <el-empty
          v-if="!hasTriggerSignature"
          :description="$t('Add trigger matching rules to see related integrations')"
        />
        <el-empty
          v-else-if="!upstreamIntegrations.length"
          :description="$t('No integrations currently emit this event')"
        />
        <div v-else class="integration-grid">
          <el-card
            v-for="integration in upstreamIntegrations"
            :key="integration._id"
            class="integration-pill"
          >
            <div class="pill-content">
              <div>
                <h4>{{ renderIntegrationName(integration) }}</h4>
                <p>{{ renderIntegrationSummary(integration) }}</p>
              </div>
              <el-button type="primary" text @click="navigateToIntegration(integration._id)">
                {{ $t('Open') }}
              </el-button>
            </div>
          </el-card>
        </div>
      </div>
    </section>

    <div class="workflow-connector">
      <el-icon><icon-bottom /></el-icon>
    </div>

    <section class="workflow-stage">
      <header class="stage-header">
        <div class="stage-index">1</div>
        <div>
          <h3>{{ $t('Trigger') }}</h3>
          <p>{{ $t('Configure the event listener that starts this workflow.') }}</p>
        </div>
      </header>
      <div class="stage-body">
        <TriggerTab v-model="trigger" :integration-id="props.integrationId" />
      </div>
    </section>

    <div class="workflow-connector">
      <el-icon><icon-bottom /></el-icon>
    </div>

    <section class="workflow-stage">
      <header class="stage-header">
        <div class="stage-index">2</div>
        <div>
          <h3>{{ $t('Data manipulation') }}</h3>
          <p>{{ $t('Transform, enrich or validate the payload before targeting another system.') }}</p>
        </div>
      </header>
      <div class="stage-body">
        <DataManipulationTab v-model="dataManipulation" />
      </div>
    </section>

    <div class="workflow-connector">
      <el-icon><icon-bottom /></el-icon>
    </div>

    <section class="workflow-stage">
      <header class="stage-header">
        <div class="stage-index">3</div>
        <div>
          <h3>{{ $t('Target') }}</h3>
          <p>{{ $t('Choose where the processed data goes and how the action executes.') }}</p>
        </div>
      </header>
      <div class="stage-body">
        <TargetTab v-model="target" :integration-id="props.integrationId" />
      </div>
    </section>

    <div class="workflow-connector">
      <el-icon><icon-bottom /></el-icon>
    </div>

    <section class="workflow-stage">
      <header class="stage-header">
        <div class="stage-index">4</div>
        <div>
          <h3>{{ $t('Trigger response') }}</h3>
          <p>{{ $t('Broadcast a platform event when the target succeeds.') }}</p>
        </div>
      </header>
      <div class="stage-body">
        <TriggerResponseTab v-model="target" :integration-id="props.integrationId" />
      </div>
    </section>

    <div class="workflow-connector">
      <el-icon><icon-bottom /></el-icon>
    </div>

    <section class="workflow-stage">
      <header class="stage-header">
        <div class="stage-index">5</div>
        <div>
          <h3>{{ $t('Downstream automations') }}</h3>
          <p>{{ $t('Integrations that listen to this trigger response.') }}</p>
        </div>
      </header>
      <div class="stage-body">
        <el-alert type="info" :closable="false" class="mb-3">
          {{ $t('Enable trigger responses to let other workflows subscribe to this integration.') }}
        </el-alert>
        <el-empty
          v-if="!hasTriggerResponseSignature"
          :description="$t('Configure trigger response source, kind and event to discover listeners')"
        />
        <el-empty
          v-else-if="!downstreamIntegrations.length"
          :description="$t('No integrations listen to this event yet')"
        />
        <div v-else class="integration-grid">
          <el-card
            v-for="integration in downstreamIntegrations"
            :key="integration._id"
            class="integration-pill"
          >
            <div class="pill-content">
              <div>
                <h4>{{ renderIntegrationName(integration) }}</h4>
                <p>{{ renderIntegrationSummary(integration) }}</p>
              </div>
              <el-button type="primary" text @click="navigateToIntegration(integration._id)">
                {{ $t('Open') }}
              </el-button>
            </div>
          </el-card>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.workflow-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-block: 10px;
}

.workflow-stage {
  border: 1px solid var(--el-border-color);
  border-radius: 12px;
  padding: 18px;
  background: var(--el-bg-color);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.06);
}

.stage-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.stage-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.stage-header p {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
}

.stage-index {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.workflow-connector {
  align-self: center;
  color: var(--el-text-color-secondary);
}

.integration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.integration-pill {
  border-radius: 12px;
}

.pill-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.pill-content h4 {
  margin: 0;
  font-size: 15px;
}

.pill-content p {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.stage-body :deep(.section-container),
.stage-body :deep(.target-container),
.stage-body :deep(.trigger-container),
.stage-body :deep(.trigger-response-tab),
.stage-body :deep(.data-manipulation-tab) {
  margin-bottom: 0;
  border: none;
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.stage-body :deep(.el-alert.mb-3) {
  margin-bottom: 12px;
}

.stage-body :deep(.section-container + .section-container) {
  margin-top: 16px;
}

@media (max-width: 768px) {
  .pill-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
