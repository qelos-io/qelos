<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import TriggerTab from '@/modules/integrations/components/tabs/TriggerTab.vue';
import DataManipulationTab from '@/modules/integrations/components/tabs/DataManipulationTab.vue';
import TargetTab from '@/modules/integrations/components/tabs/TargetTab.vue';
import TriggerResponseTab from '@/modules/integrations/components/tabs/TriggerResponseTab.vue';
import AccessControlStep from '@/modules/integrations/components/forms/AccessControlStep.vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import {
  WORKFLOW_STEPS,
  firstStepToOpen,
  nextStep,
  stepState,
  stepSummary,
  stepsNeedingAttention,
  type StepId,
} from '../services/workflow-steps';

const trigger = defineModel<any>('trigger', { required: true });
const target = defineModel<any>('target', { required: true });
const dataManipulation = defineModel<any>('dataManipulation', { required: true });
const targetManipulation = defineModel<any>('targetManipulation', { required: true });

const props = defineProps<{ integrationId?: string }>();

const { t } = useI18n();
const router = useRouter();
const integrationsStore = useIntegrationsStore();
const sourcesStore = useIntegrationSourcesStore();

const sourcesById = computed(() => Object.fromEntries((sourcesStore.result || []).map((source: any) => [source._id, source])));
const sourceName = (id?: string) => (id && sourcesById.value[id]?.name) || '';

// ---- access control ----
const ensureTriggerDetails = () => {
  if (!trigger.value) trigger.value = { source: '', operation: '', details: {} };
  if (!trigger.value.details) trigger.value.details = {};
  return trigger.value.details;
};

const accessControlPermissions = computed({
  get: () => ({
    roles: trigger.value?.details?.roles || [],
    workspaceRoles: trigger.value?.details?.workspaceRoles || [],
    workspaceLabels: trigger.value?.details?.workspaceLabels || [],
  }),
  set: (value: { roles?: string[]; workspaceRoles?: string[]; workspaceLabels?: string[] }) => {
    const details = ensureTriggerDetails();
    details.roles = value.roles || [];
    details.workspaceRoles = value.workspaceRoles || [];
    details.workspaceLabels = value.workspaceLabels || [];
  },
});

const guestAccessAllowed = computed(() => (accessControlPermissions.value.roles || []).includes('guest'));

// ---- related automations: who sends events into this trigger, and who listens to its response ----
const signature = (details: Record<string, any> | undefined) => ({ source: details?.source || '', kind: details?.kind || '', eventName: details?.eventName || '' });
const isComplete = (value: { source: string; kind: string; eventName: string }) => !!(value.source && value.kind && value.eventName);

const triggerSignature = computed(() => signature(trigger.value?.details));
const responseSignature = computed(() => signature(target.value?.details?.triggerResponse));
const sameSignature = (a: ReturnType<typeof signature>, b: ReturnType<typeof signature>) => a.source === b.source && a.kind === b.kind && a.eventName === b.eventName;

const upstreamIntegrations = computed(() => {
  if (!isComplete(triggerSignature.value)) return [];
  return (integrationsStore.integrations || []).filter(
    (integration: any) => integration._id !== props.integrationId && integration.target?.details?.triggerResponse && sameSignature(signature(integration.target.details.triggerResponse), triggerSignature.value),
  );
});

const downstreamIntegrations = computed(() => {
  if (!isComplete(responseSignature.value)) return [];
  return (integrationsStore.integrations || []).filter(
    (integration: any) => integration._id !== props.integrationId && sameSignature(signature(integration.trigger?.details), responseSignature.value),
  );
});

const snapshot = computed(() => ({
  trigger: trigger.value,
  target: target.value,
  dataManipulation: dataManipulation.value,
  targetManipulation: targetManipulation.value,
  upstreamCount: upstreamIntegrations.value.length,
  downstreamCount: downstreamIntegrations.value.length,
}));

const countText = (n: number) => t('{count} items', { count: n });
const steps = computed(() =>
  WORKFLOW_STEPS.map((step) => ({
    ...step,
    state: stepState(step.id, snapshot.value),
    summary: stepSummary(step.id, snapshot.value, sourceName, countText),
  })),
);
const needsAttention = computed(() => stepsNeedingAttention(snapshot.value));

// ---- which step is open ----
const active = ref<StepId>(firstStepToOpen(snapshot.value));
watch(
  () => props.integrationId,
  () => (active.value = firstStepToOpen(snapshot.value)),
);
const activeStep = computed(() => steps.value.find((step) => step.id === active.value)!);
const previous = computed(() => nextStep(active.value, -1));
const following = computed(() => nextStep(active.value, 1));
const titleOf = (id: StepId | null) => (id ? t(WORKFLOW_STEPS.find((step) => step.id === id)!.title) : '');

const stateLabel = (state: string, required: boolean) =>
  state === 'done' ? t('Configured') : state === 'todo' ? t('Needs setup') : state === 'info' ? '' : required ? t('Required') : t('Optional');

const openIntegration = (id: string) => router.push({ name: 'integration-edit', params: { integrationId: id } });
const nameOf = (integration: any) => integration.trigger?.details?.name || sourceName(integration.trigger?.source) || t('Unnamed integration');
const summaryOf = (integration: any) => integration.trigger?.details?.description || sourceName(integration.target?.source) || '';
</script>

<template>
  <div class="workflow">
    <nav class="steps" :aria-label="$t('Workflow steps')">
      <ol>
        <li v-for="(step, index) in steps" :key="step.id" :class="`stage-${step.stage}`">
          <button type="button" class="step" :class="[`state-${step.state}`, { active: step.id === active }]" :aria-current="step.id === active ? 'step' : undefined" @click="active = step.id">
            <span class="marker" aria-hidden="true">
              <font-awesome-icon v-if="step.state === 'done'" :icon="['fas', 'check']" />
              <font-awesome-icon v-else-if="step.state === 'todo'" :icon="['fas', 'exclamation']" />
              <template v-else>{{ index + 1 }}</template>
            </span>
            <span class="label">
              <span class="step-title">{{ $t(step.title) }}</span>
              <span v-if="step.summary" class="step-summary" dir="auto">{{ step.summary }}</span>
              <span v-else-if="stateLabel(step.state, step.required)" class="step-summary">{{ stateLabel(step.state, step.required) }}</span>
            </span>
          </button>
        </li>
      </ol>
    </nav>

    <section class="panel" :aria-labelledby="`step-${active}`">
      <header class="panel-head">
        <div>
          <h2 :id="`step-${active}`">{{ $t(activeStep.title) }}</h2>
          <p>{{ $t(activeStep.description) }}</p>
        </div>
        <el-tag v-if="activeStep.required" size="small" :type="activeStep.state === 'done' ? 'success' : 'danger'" effect="light">{{ activeStep.state === 'done' ? $t('Configured') : $t('Required') }}</el-tag>
        <el-tag v-else-if="activeStep.state !== 'info'" size="small" effect="light" type="info">{{ $t('Optional') }}</el-tag>
      </header>

      <el-alert v-if="needsAttention.length && active !== needsAttention[0] && !activeStep.required" class="hint" type="warning" :closable="false" show-icon>
        <template #title>{{ $t('Finish the required steps before saving:') }} {{ needsAttention.map((id) => titleOf(id)).join(', ') }}</template>
      </el-alert>

      <div class="panel-body">
        <!-- the heavy editors are mounted only while their step is open; their data lives in the models above -->
        <template v-if="active === 'upstream'">
          <p v-if="!isComplete(triggerSignature)" class="empty">{{ $t('Add trigger matching rules to see related integrations') }}</p>
          <p v-else-if="!upstreamIntegrations.length" class="empty">{{ $t('No integrations currently emit this event') }}</p>
          <ul v-else class="related">
            <li v-for="integration in upstreamIntegrations" :key="integration._id">
              <span class="related-text"><strong dir="auto">{{ nameOf(integration) }}</strong><small dir="auto">{{ summaryOf(integration) }}</small></span>
              <el-button text type="primary" @click="openIntegration(integration._id)">{{ $t('Open') }}</el-button>
            </li>
          </ul>
        </template>

        <template v-else-if="active === 'access'">
          <p class="mode"><el-tag size="small" :type="guestAccessAllowed ? 'success' : 'warning'" effect="light">{{ guestAccessAllowed ? $t('Guests Allowed') : $t('Authenticated Users') }}</el-tag></p>
          <AccessControlStep v-model:permissions="accessControlPermissions" />
        </template>

        <TriggerTab v-else-if="active === 'trigger'" v-model="trigger" :integration-id="props.integrationId" />
        <DataManipulationTab v-else-if="active === 'data'" v-model="dataManipulation" :trigger="trigger" />
        <TargetTab v-else-if="active === 'target'" v-model="target" :integration-id="props.integrationId" />
        <DataManipulationTab v-else-if="active === 'target-data'" v-model="targetManipulation" />
        <TriggerResponseTab v-else-if="active === 'response'" v-model="target" :integration-id="props.integrationId" />

        <template v-else-if="active === 'downstream'">
          <p v-if="!isComplete(responseSignature)" class="empty">{{ $t('Configure a trigger response to see which integrations listen to it') }}</p>
          <p v-else-if="!downstreamIntegrations.length" class="empty">{{ $t('No integrations listen to this trigger response yet') }}</p>
          <ul v-else class="related">
            <li v-for="integration in downstreamIntegrations" :key="integration._id">
              <span class="related-text"><strong dir="auto">{{ nameOf(integration) }}</strong><small dir="auto">{{ summaryOf(integration) }}</small></span>
              <el-button text type="primary" @click="openIntegration(integration._id)">{{ $t('Open') }}</el-button>
            </li>
          </ul>
        </template>
      </div>

      <footer class="panel-foot">
        <el-button v-if="previous" text @click="active = previous"><el-icon class="dir-icon"><ArrowLeft /></el-icon>{{ titleOf(previous) }}</el-button>
        <span class="grow" />
        <el-button v-if="following" type="primary" plain @click="active = following">{{ titleOf(following) }}<el-icon class="dir-icon after"><ArrowRight /></el-icon></el-button>
      </footer>
    </section>
  </div>
</template>

<style scoped lang="scss">
.workflow {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  align-items: start;
  gap: 16px;
}

.steps {
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

  // a hairline between the three stages of the flow
  li.stage-process,
  li.stage-finish {
    &:not(.stage-process + .stage-process):not(.stage-finish + .stage-finish) {
      margin-block-start: 6px;
      padding-block-start: 6px;
      border-block-start: 1px solid var(--el-border-color-extra-light);
    }
  }
}

.step {
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

.marker {
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

.state-done .marker {
  border-color: var(--el-color-success);
  background: var(--el-color-success);
  color: #fff;
}

.state-todo .marker {
  border-color: var(--el-color-danger);
  background: var(--el-color-danger);
  color: #fff;
}

.active .marker {
  border-color: var(--el-color-primary);
}

.label {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.step-title {
  font-size: 0.92rem;
  font-weight: 600;
}

.step-summary {
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 0.8rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-todo .step-summary {
  color: var(--el-color-danger);
}

.panel {
  min-inline-size: 0;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: var(--surface);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 8px;

  h2 {
    margin: 0;
    padding: 0;
    font-size: 1.15rem;
  }

  p {
    margin: 4px 0 0;
    color: var(--el-text-color-secondary);
    font-size: 0.9rem;
    text-align: start;
  }
}

.hint {
  margin: 4px 20px 0;
  inline-size: auto;
}

.panel-body {
  min-inline-size: 0;
  padding: 8px 20px 16px;
}

.panel-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-block-start: 1px solid var(--el-border-color-extra-light);
}

.grow {
  flex: 1;
}

.mode {
  margin: 0 0 8px;
}

.empty {
  margin: 0;
  padding: 18px;
  border: 1px dashed var(--el-border-color);
  border-radius: 10px;
  color: var(--el-text-color-secondary);
  text-align: start;
}

.related {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
  }

  li + li {
    border-block-start: 1px solid var(--el-border-color-extra-light);
  }
}

.related-text {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;

  small {
    color: var(--el-text-color-secondary);
  }
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
}

.after {
  margin-inline-start: 6px;
}

@media (max-width: 1023px) {
  .workflow {
    grid-template-columns: minmax(0, 1fr);
  }

  // the list becomes a horizontally scrolling strip above the step
  .steps {
    position: static;
    padding: 6px;
    overflow-x: auto;

    ol {
      flex-direction: row;
      gap: 4px;
    }

    li.stage-process,
    li.stage-finish {
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
    }
  }

  .step {
    inline-size: auto;
    white-space: nowrap;
  }

  .step-summary {
    display: none;
  }
}

@media (max-width: 639px) {
  .panel-head {
    padding: 12px 12px 4px;
  }

  .panel-body {
    padding: 8px 12px 12px;
  }

  .hint {
    margin-inline: 12px;
  }
}
</style>
