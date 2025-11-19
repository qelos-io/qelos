<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import TriggerTab from '@/modules/integrations/components/tabs/TriggerTab.vue';
import DataManipulationTab from '@/modules/integrations/components/tabs/DataManipulationTab.vue';
import TargetTab from '@/modules/integrations/components/tabs/TargetTab.vue';
import TriggerResponseTab from '@/modules/integrations/components/tabs/TriggerResponseTab.vue';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
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
const integrationKinds = useIntegrationKinds();

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

// Get source logos for trigger and target
const triggerSourceLogo = computed(() => {
  if (!trigger.value?.source) return null;
  const source = sourcesById.value[trigger.value.source];
  if (!source?.kind) return null;
  return integrationKinds[source.kind]?.logo || null;
});

const targetSourceLogo = computed(() => {
  if (!target.value?.source) return null;
  const source = sourcesById.value[target.value.source];
  if (!source?.kind) return null;
  return integrationKinds[source.kind]?.logo || null;
});

// Workflow step state management
const expandedSteps = ref(new Set(['trigger'])); // Start with trigger expanded
const workflowSteps = computed(() => [
  { id: 'upstream', title: 'Incoming Signals', icon: 'Connection', optional: true },
  { 
    id: 'trigger', 
    title: 'Trigger', 
    subtitle: trigger.value?.operation || '',
    icon: 'Promotion', 
    required: true 
  },
  { id: 'data-manipulation', title: 'Data Manipulation', icon: 'DataAnalysis', optional: true },
  { 
    id: 'target', 
    title: 'Target', 
    subtitle: target.value?.operation || '',
    icon: 'Position', 
    required: true 
  },
  { id: 'trigger-response', title: 'Trigger Response', icon: 'ArrowRight', optional: true },
  { id: 'downstream', title: 'Downstream Automations', icon: 'Connection', optional: true }
]);

const toggleStep = (stepId: string) => {
  if (expandedSteps.value.has(stepId)) {
    expandedSteps.value.delete(stepId);
  } else {
    expandedSteps.value.add(stepId);
  }
  
  // Scroll to the step after a short delay to allow expansion animation
  setTimeout(() => {
    scrollToStep(stepId);
  }, 100);
};

const scrollToStep = (stepId: string) => {
  const element = document.querySelector(`[data-step-id="${stepId}"]`);
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });
    
    // Add a highlight effect
    element.classList.add('step-highlight');
    setTimeout(() => {
      element.classList.remove('step-highlight');
    }, 1500);
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

// Get node color based on status
const getNodeColor = (status: string) => {
  switch (status) {
    case 'success':
      return '#67c23a';
    case 'error':
      return '#f56c6c';
    case 'warning':
      return '#e6a23c';
    case 'inactive':
      return '#dcdfe6';
    default:
      return '#909399';
  }
};

// Scroll handling for sticky diagram
const isScrolled = ref(false);
const scrollThreshold = 100;
let scrollCleanup: (() => void) | null = null;

onMounted(() => {
  // Use nextTick to ensure dialog is fully rendered
  setTimeout(() => {
    // Try multiple selectors for the scrollable container
    const possibleContainers = [
      '.el-dialog__body',
      '.view-wrapper',
      '.el-form',
      '[class*="dialog"][class*="body"]'
    ];
    
    let dialogBody: Element | null = null;
    for (const selector of possibleContainers) {
      dialogBody = document.querySelector(selector);
      if (dialogBody) {
        const style = window.getComputedStyle(dialogBody);
        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          break;
        }
      }
    }
    
    if (dialogBody) {
      const handleScroll = () => {
        isScrolled.value = dialogBody!.scrollTop > scrollThreshold;
      };
      
      dialogBody.addEventListener('scroll', handleScroll);
      
      // Store cleanup function
      scrollCleanup = () => {
        dialogBody!.removeEventListener('scroll', handleScroll);
      };
    }
  }, 100);
});

onUnmounted(() => {
  if (scrollCleanup) {
    scrollCleanup();
  }
});
</script>

<template>
  <div class="workflow-container">
    <!-- Workflow Header with Progress -->
    <div class="workflow-header">
      <div class="workflow-title">
        <h2>{{ $t('Workflow Designer') }}</h2>
        <p>{{ $t('Design your integration workflow with visual steps and connections') }}</p>
      </div>
      <div class="workflow-controls">
        <div class="progress-indicator">
          <el-progress 
            :percentage="workflowProgress" 
            :color="workflowProgress === 100 ? '#67c23a' : '#409eff'"
            :stroke-width="8"
            class="workflow-progress"
          />
          <span class="progress-text">{{ workflowProgress }}% {{ $t('Complete') }}</span>
        </div>
        <el-button 
          :icon="View" 
          circle 
          size="small" 
          @click="showMinimap = !showMinimap"
          :type="showMinimap ? 'primary' : 'default'"
        />
      </div>
    </div>

    <!-- Visual Workflow Diagram -->
    <div class="workflow-diagram-wrapper" :class="{ 'is-sticky': isScrolled }">
      <div class="workflow-diagram" :class="{ 'is-compact': isScrolled }">
        <svg class="workflow-svg" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#409eff;stop-opacity:0.2" />
            <stop offset="50%" style="stop-color:#409eff;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:#409eff;stop-opacity:0.2" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Connection lines -->
        <g class="connection-lines">
          <line 
            v-for="(step, index) in workflowSteps.slice(0, -1)" 
            :key="`line-${index}`"
            :x1="200 * index + 150" 
            y1="100" 
            :x2="200 * (index + 1) + 50" 
            y2="100" 
            stroke="url(#flowGradient)" 
            stroke-width="3"
            :class="{ 'active-line': getStepStatus(step.id) === 'success' && getStepStatus(workflowSteps[index + 1].id) !== 'inactive' }"
          />
        </g>
        
        <!-- Workflow nodes -->
        <g class="workflow-nodes">
          <g 
            v-for="(step, index) in workflowSteps" 
            :key="step.id"
            :transform="`translate(${200 * index + 100}, 100)`"
            class="workflow-node"
            :class="`status-${getStepStatus(step.id)}`"
            @click="toggleStep(step.id)"
          >
            <!-- Hover circle (behind) -->
            <circle 
              r="50" 
              :fill="getNodeColor(getStepStatus(step.id))"
              opacity="0"
              class="node-hover-circle"
            />
            <!-- Main circle -->
            <circle 
              r="40" 
              :fill="getNodeColor(getStepStatus(step.id))"
              stroke="white"
              stroke-width="3"
              filter="url(#glow)"
              class="node-circle"
            />
            <text y="5" text-anchor="middle" fill="white" font-size="24" font-weight="bold">
              {{ index }}
            </text>
            <text y="60" text-anchor="middle" font-size="12" fill="#606266" class="node-label">
              {{ step.title }}
            </text>
            <text v-if="step.subtitle" y="75" text-anchor="middle" font-size="10" fill="#909399" class="node-subtitle">
              {{ step.subtitle }}
            </text>
            <!-- Source icon badge for trigger -->
            <g v-if="index === 1 && triggerSourceLogo" class="source-badge">
              <defs>
                <clipPath :id="`badge-clip-trigger-${index}`">
                  <circle cx="28" cy="28" r="15"/>
                </clipPath>
              </defs>
              <g :clip-path="`url(#badge-clip-trigger-${index})`">
                <circle cx="28" cy="28" r="16" fill="white" stroke="#e0e0e0" stroke-width="1"/>
                <image 
                  :href="triggerSourceLogo" 
                  x="16" 
                  y="16" 
                  width="24" 
                  height="24" 
                  preserveAspectRatio="xMidYMid slice"
                />
              </g>
            </g>
            <!-- Source icon badge for target -->
            <g v-if="index === 3 && targetSourceLogo" class="source-badge">
              <defs>
                <clipPath :id="`badge-clip-target-${index}`">
                  <circle cx="28" cy="28" r="15"/>
                </clipPath>
              </defs>
              <g :clip-path="`url(#badge-clip-target-${index})`">
                <circle cx="28" cy="28" r="16" fill="white" stroke="#e0e0e0" stroke-width="1"/>
                <image 
                  :href="targetSourceLogo" 
                  x="16" 
                  y="16" 
                  width="24" 
                  height="24" 
                  preserveAspectRatio="xMidYMid slice"
                />
              </g>
            </g>
          </g>
        </g>
      </svg>
      </div>
    </div>

    <!-- Workflow Minimap -->
    <el-collapse-transition>
      <div v-show="showMinimap" class="workflow-minimap">
        <div class="minimap-steps">
          <div 
            v-for="(step, index) in workflowSteps" 
            :key="step.id"
            class="minimap-step"
            :class="`status-${getStepStatus(step.id)}`"
            @click="toggleStep(step.id)"
          >
            <div class="minimap-step-dot"></div>
            <span class="minimap-step-label">{{ step.title }}</span>
            <el-icon v-if="index < workflowSteps.length - 1" class="minimap-connector"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </el-collapse-transition>

    <!-- Visual Workflow Steps -->
    <div class="workflow-canvas">
      <!-- Upstream Integrations -->
      <div class="workflow-step" :class="`status-${getStepStatus('upstream')}`" data-step-id="upstream">
        <div class="step-header" @click="toggleStep('upstream')">
          <div class="step-indicator">
            <el-icon class="step-status-icon" :class="`status-${getStepStatus('upstream')}`">
              <component :is="getStepIcon('upstream', getStepStatus('upstream'))" />
            </el-icon>
            <div class="step-number">0</div>
          </div>
          <div class="step-info">
            <h3>{{ $t('Incoming Signals') }}</h3>
            <p>{{ $t('Integrations that emit events matching this trigger') }}</p>
            <div class="step-badges">
              <el-tag size="small" type="info">{{ $t('Optional') }}</el-tag>
              <el-tag v-if="upstreamIntegrations.length > 0" size="small" type="success">
                {{ upstreamIntegrations.length }} {{ $t('connected') }}
              </el-tag>
            </div>
          </div>
          <div class="step-actions">
            <el-icon class="expand-icon" :class="{ expanded: isStepExpanded('upstream') }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>
        <el-collapse-transition>
          <div v-show="isStepExpanded('upstream')" class="step-content">
            <el-alert type="info" :closable="false" class="step-alert">
              {{ $t('Define the trigger source, kind and event to discover upstream automations.') }}
            </el-alert>
            <el-empty
              v-if="!hasTriggerSignature"
              :description="$t('Add trigger matching rules to see related integrations')"
              :image-size="80"
            />
            <el-empty
              v-else-if="!upstreamIntegrations.length"
              :description="$t('No integrations currently emit this event')"
              :image-size="80"
            />
            <div v-else class="integration-grid">
              <el-card
                v-for="integration in upstreamIntegrations"
                :key="integration._id"
                class="integration-card"
                shadow="hover"
              >
                <div class="integration-content">
                  <div class="integration-info">
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
        </el-collapse-transition>
      </div>

      <!-- Flow Connector -->
      <div class="flow-connector" :class="{ active: getStepStatus('upstream') === 'success' }">
        <div class="connector-line"></div>
        <div class="connector-arrow"><el-icon><ArrowDown /></el-icon></div>
      </div>

      <!-- Trigger Step -->
      <div class="workflow-step" :class="`status-${getStepStatus('trigger')}`" data-step-id="trigger">
        <div class="step-header" @click="toggleStep('trigger')">
          <div class="step-indicator">
            <el-icon class="step-status-icon" :class="`status-${getStepStatus('trigger')}`">
              <component :is="getStepIcon('trigger', getStepStatus('trigger'))" />
            </el-icon>
            <div class="step-number">1</div>
          </div>
          <div class="step-info">
            <h3>{{ $t('Trigger') }}</h3>
            <p>{{ $t('Configure the event listener that starts this workflow') }}</p>
            <div class="step-badges">
              <el-tag size="small" type="danger">{{ $t('Required') }}</el-tag>
              <el-tag v-if="trigger?.source" size="small" type="success">
                {{ sourcesById[trigger.source]?.name || $t('Configured') }}
              </el-tag>
              <el-tag v-if="trigger?.operation" size="small" type="primary">
                {{ trigger.operation }}
              </el-tag>
            </div>
          </div>
          <div class="step-actions">
            <el-icon class="expand-icon" :class="{ expanded: isStepExpanded('trigger') }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>
        <el-collapse-transition>
          <div v-show="isStepExpanded('trigger')" class="step-content">
            <TriggerTab v-model="trigger" :integration-id="props.integrationId" />
          </div>
        </el-collapse-transition>
      </div>

      <!-- Flow Connector -->
      <div class="flow-connector" :class="{ active: getStepStatus('trigger') === 'success' }">
        <div class="connector-line"></div>
        <div class="connector-arrow"><el-icon><ArrowDown /></el-icon></div>
      </div>

      <!-- Data Manipulation Step -->
      <div class="workflow-step" :class="`status-${getStepStatus('data-manipulation')}`" data-step-id="data-manipulation">
        <div class="step-header" @click="toggleStep('data-manipulation')">
          <div class="step-indicator">
            <el-icon class="step-status-icon" :class="`status-${getStepStatus('data-manipulation')}`">
              <component :is="getStepIcon('data-manipulation', getStepStatus('data-manipulation'))" />
            </el-icon>
            <div class="step-number">2</div>
          </div>
          <div class="step-info">
            <h3>{{ $t('Data Manipulation') }}</h3>
            <p>{{ $t('Transform, enrich or validate the payload before targeting another system') }}</p>
            <div class="step-badges">
              <el-tag size="small" type="info">{{ $t('Optional') }}</el-tag>
              <el-tag v-if="dataManipulation?.length > 0" size="small" type="success">
                {{ dataManipulation.length }} {{ $t('operations') }}
              </el-tag>
            </div>
          </div>
          <div class="step-actions">
            <el-icon class="expand-icon" :class="{ expanded: isStepExpanded('data-manipulation') }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>
        <el-collapse-transition>
          <div v-show="isStepExpanded('data-manipulation')" class="step-content">
            <DataManipulationTab v-model="dataManipulation" />
          </div>
        </el-collapse-transition>
      </div>

      <!-- Flow Connector -->
      <div class="flow-connector" :class="{ active: getStepStatus('trigger') === 'success' }">
        <div class="connector-line"></div>
        <div class="connector-arrow"><el-icon><ArrowDown /></el-icon></div>
      </div>

      <!-- Target Step -->
      <div class="workflow-step" :class="`status-${getStepStatus('target')}`" data-step-id="target">
        <div class="step-header" @click="toggleStep('target')">
          <div class="step-indicator">
            <el-icon class="step-status-icon" :class="`status-${getStepStatus('target')}`">
              <component :is="getStepIcon('target', getStepStatus('target'))" />
            </el-icon>
            <div class="step-number">3</div>
          </div>
          <div class="step-info">
            <h3>{{ $t('Target') }}</h3>
            <p>{{ $t('Choose where the processed data goes and how the action executes') }}</p>
            <div class="step-badges">
              <el-tag size="small" type="danger">{{ $t('Required') }}</el-tag>
              <el-tag v-if="target?.source" size="small" type="success">
                {{ sourcesById[target.source]?.name || $t('Configured') }}
              </el-tag>
              <el-tag v-if="target?.operation" size="small" type="primary">
                {{ target.operation }}
              </el-tag>
            </div>
          </div>
          <div class="step-actions">
            <el-icon class="expand-icon" :class="{ expanded: isStepExpanded('target') }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>
        <el-collapse-transition>
          <div v-show="isStepExpanded('target')" class="step-content">
            <TargetTab v-model="target" :integration-id="props.integrationId" />
          </div>
        </el-collapse-transition>
      </div>

      <!-- Flow Connector -->
      <div class="flow-connector" :class="{ active: getStepStatus('target') === 'success' }">
        <div class="connector-line"></div>
        <div class="connector-arrow"><el-icon><ArrowDown /></el-icon></div>
      </div>

      <!-- Trigger Response Step -->
      <div class="workflow-step" :class="`status-${getStepStatus('trigger-response')}`" data-step-id="trigger-response">
        <div class="step-header" @click="toggleStep('trigger-response')">
          <div class="step-indicator">
            <el-icon class="step-status-icon" :class="`status-${getStepStatus('trigger-response')}`">
              <component :is="getStepIcon('trigger-response', getStepStatus('trigger-response'))" />
            </el-icon>
            <div class="step-number">4</div>
          </div>
          <div class="step-info">
            <h3>{{ $t('Trigger Response') }}</h3>
            <p>{{ $t('Broadcast a platform event when the target succeeds') }}</p>
            <div class="step-badges">
              <el-tag size="small" type="info">{{ $t('Optional') }}</el-tag>
              <el-tag v-if="hasTriggerResponseSignature" size="small" type="success">
                {{ $t('Configured') }}
              </el-tag>
            </div>
          </div>
          <div class="step-actions">
            <el-icon class="expand-icon" :class="{ expanded: isStepExpanded('trigger-response') }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>
        <el-collapse-transition>
          <div v-show="isStepExpanded('trigger-response')" class="step-content">
            <TriggerResponseTab v-model="target" :integration-id="props.integrationId" />
          </div>
        </el-collapse-transition>
      </div>

      <!-- Flow Connector -->
      <div class="flow-connector" :class="{ active: getStepStatus('trigger-response') === 'success' }">
        <div class="connector-line"></div>
        <div class="connector-arrow"><el-icon><ArrowDown /></el-icon></div>
      </div>

      <!-- Downstream Integrations -->
      <div class="workflow-step" :class="`status-${getStepStatus('downstream')}`" data-step-id="downstream">
        <div class="step-header" @click="toggleStep('downstream')">
          <div class="step-indicator">
            <el-icon class="step-status-icon" :class="`status-${getStepStatus('downstream')}`">
              <component :is="getStepIcon('downstream', getStepStatus('downstream'))" />
            </el-icon>
            <div class="step-number">5</div>
          </div>
          <div class="step-info">
            <h3>{{ $t('Downstream Automations') }}</h3>
            <p>{{ $t('Integrations that listen to this trigger response') }}</p>
            <div class="step-badges">
              <el-tag size="small" type="info">{{ $t('Optional') }}</el-tag>
              <el-tag v-if="downstreamIntegrations.length > 0" size="small" type="success">
                {{ downstreamIntegrations.length }} {{ $t('listening') }}
              </el-tag>
            </div>
          </div>
          <div class="step-actions">
            <el-icon class="expand-icon" :class="{ expanded: isStepExpanded('downstream') }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>
        <el-collapse-transition>
          <div v-show="isStepExpanded('downstream')" class="step-content">
            <el-alert type="info" :closable="false" class="step-alert">
              {{ $t('Enable trigger responses to let other workflows subscribe to this integration.') }}
            </el-alert>
            <el-empty
              v-if="!hasTriggerResponseSignature"
              :description="$t('Configure trigger response source, kind and event to discover listeners')"
              :image-size="80"
            />
            <el-empty
              v-else-if="!downstreamIntegrations.length"
              :description="$t('No integrations listen to this event yet')"
              :image-size="80"
            />
            <div v-else class="integration-grid">
              <el-card
                v-for="integration in downstreamIntegrations"
                :key="integration._id"
                class="integration-card"
                shadow="hover"
              >
                <div class="integration-content">
                  <div class="integration-info">
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
        </el-collapse-transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workflow-container {
  padding: 20px;
  background: var(--el-bg-color-page);
  min-height: 100vh;
  position: relative; /* Establish stacking context for sticky */
}

/* Workflow Header */
.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding: 20px;
  background: var(--el-bg-color);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.workflow-title h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.workflow-title p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.workflow-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-progress {
  width: 120px;
}

.progress-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

/* Workflow Diagram Wrapper */
.workflow-diagram-wrapper {
  position: relative;
  z-index: 100;
  transition: all 0.3s ease;
}

.workflow-diagram-wrapper.is-sticky {
  position: sticky;
  top: -20px; /* Negative top to account for dialog padding */
  background: var(--el-bg-color);
  padding: 0;
  margin: -20px -20px 20px -20px; /* Negative margins to extend to dialog edges */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

/* Workflow Diagram */
.workflow-diagram {
  margin-bottom: 32px;
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
  border-radius: 16px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
}

.workflow-diagram.is-compact {
  padding: 12px;
  margin-bottom: 16px;
}

.workflow-diagram::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(64, 158, 255, 0.1) 0%, transparent 70%);
  animation: pulse-bg 4s ease-in-out infinite;
}

@keyframes pulse-bg {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.workflow-svg {
  width: 100%;
  height: 200px;
  position: relative;
  z-index: 1;
  transition: height 0.3s ease;
}

.workflow-diagram.is-compact .workflow-svg {
  height: 120px;
}

.workflow-diagram.is-sticky .workflow-svg {
  height: 80px;
}


/* Hide labels in compact mode but keep badges */
.workflow-diagram.is-compact .node-label,
.workflow-diagram.is-compact .node-subtitle {
  display: none;
}

/* Adjust badge size in compact mode */
.workflow-diagram.is-compact .source-badge {
  transform: scale(0.8);
  transform-origin: 28px 28px;
}

/* Adjust background animation in compact mode */
.workflow-diagram.is-compact::before {
  display: none;
}

.workflow-node {
  cursor: pointer;
}

.node-circle {
  animation: node-appear 0.6s ease-out backwards;
  transition: stroke-width 0.3s ease;
}

.node-hover-circle {
  transition: opacity 0.3s ease;
  r: 50;
  filter: blur(8px);
}

.workflow-node:hover .node-hover-circle {
  opacity: 0.4;
}

.workflow-node:hover .node-circle {
  stroke-width: 4;
  filter: url(#glow) drop-shadow(0 0 12px rgba(64, 158, 255, 0.6));
}

.workflow-node:nth-child(1) .node-circle { animation-delay: 0.1s; }
.workflow-node:nth-child(2) .node-circle { animation-delay: 0.2s; }
.workflow-node:nth-child(3) .node-circle { animation-delay: 0.3s; }
.workflow-node:nth-child(4) .node-circle { animation-delay: 0.4s; }
.workflow-node:nth-child(5) .node-circle { animation-delay: 0.5s; }
.workflow-node:nth-child(6) .node-circle { animation-delay: 0.6s; }

@keyframes node-appear {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.node-label {
  transition: all 0.3s ease;
  opacity: 0.8;
}

.workflow-node:hover .node-label {
  opacity: 1;
  font-weight: 600;
}

.node-subtitle {
  transition: all 0.3s ease;
  opacity: 0.6;
  font-style: italic;
}

.workflow-node:hover .node-subtitle {
  opacity: 1;
}

.connection-lines line {
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  animation: draw-line 1s ease-out forwards;
}

.connection-lines line:nth-child(1) { animation-delay: 0.2s; }
.connection-lines line:nth-child(2) { animation-delay: 0.4s; }
.connection-lines line:nth-child(3) { animation-delay: 0.6s; }
.connection-lines line:nth-child(4) { animation-delay: 0.8s; }
.connection-lines line:nth-child(5) { animation-delay: 1s; }

@keyframes draw-line {
  to {
    stroke-dashoffset: 0;
  }
}

.active-line {
  stroke: #67c23a !important;
  filter: drop-shadow(0 0 6px rgba(103, 194, 58, 0.5));
}

/* Status-based node animations */
.workflow-node.status-success .node-circle {
  animation: success-pulse 2s ease-in-out infinite;
}

.workflow-node.status-error .node-circle {
  animation: error-shake 0.5s ease-in-out;
}

.workflow-node.status-warning .node-circle {
  animation: warning-blink 1.5s ease-in-out infinite;
}

@keyframes success-pulse {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(103, 194, 58, 0.5)); }
  50% { filter: drop-shadow(0 0 20px rgba(103, 194, 58, 0.8)); }
}

@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

@keyframes warning-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Source badge styles */
.source-badge {
  animation: badge-appear 0.8s ease-out backwards;
  animation-delay: 0.6s;
  transition: all 0.3s ease;
}

.source-badge circle {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.source-badge image {
  opacity: 0.9;
}

.workflow-node:hover .source-badge {
  transform: scale(1.1);
}

.workflow-diagram.is-compact .workflow-node:hover .source-badge {
  transform: scale(0.9);
}

.workflow-node:hover .source-badge image {
  opacity: 1;
}

@keyframes badge-appear {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

/* Workflow Minimap */
.workflow-minimap {
  margin-bottom: 24px;
  padding: 16px 20px;
  background: var(--el-bg-color);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.minimap-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0;
}

.minimap-step {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
  white-space: nowrap;
}

.minimap-step:hover {
  background: var(--el-fill-color-light);
}

.minimap-step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-info);
  transition: all 0.2s;
}

.minimap-step.status-success .minimap-step-dot {
  background: var(--el-color-success);
}

.minimap-step.status-error .minimap-step-dot {
  background: var(--el-color-danger);
}

.minimap-step.status-warning .minimap-step-dot {
  background: var(--el-color-warning);
}

.minimap-step-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.minimap-connector {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}

/* Workflow Canvas */
.workflow-canvas {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Workflow Steps */
.workflow-step {
  background: var(--el-bg-color);
  border: 2px solid var(--el-border-color-light);
  border-radius: 16px;
  transition: all 0.3s ease;
  overflow: hidden;
  scroll-margin-top: 20px;
}

.workflow-step.step-highlight {
  animation: highlight-pulse 1.5s ease-out;
}

@keyframes highlight-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(64, 158, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}

.workflow-step.status-success {
  border-color: var(--el-color-success-light-5);
  background: var(--el-color-success-light-9);
}

.workflow-step.status-error {
  border-color: var(--el-color-danger-light-5);
  background: var(--el-color-danger-light-9);
}

.workflow-step.status-warning {
  border-color: var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
}

.workflow-step.status-inactive {
  border-color: var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

/* Step Header */
.step-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.step-header:hover {
  background: var(--el-fill-color-extra-light);
}

.step-indicator {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--el-bg-color);
  border: 2px solid var(--el-border-color);
  flex-shrink: 0;
}

.step-status-icon {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--el-bg-color);
  border: 2px solid var(--el-bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.step-status-icon.status-success {
  color: var(--el-color-success);
}

.step-status-icon.status-error {
  color: var(--el-color-danger);
}

.step-status-icon.status-warning {
  color: var(--el-color-warning);
}

.step-status-icon.status-inactive {
  color: var(--el-text-color-placeholder);
}

.step-number {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.step-info {
  flex: 1;
}

.step-info h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.step-info p {
  margin: 0 0 8px 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.step-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.step-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  transition: transform 0.2s;
  color: var(--el-text-color-secondary);
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

/* Step Content */
.step-content {
  padding: 0 20px 20px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.step-alert {
  margin-bottom: 16px;
}

/* Flow Connectors */
.flow-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 40px;
  position: relative;
  margin: -1px 0;
  z-index: 1;
}

.connector-line {
  width: 3px;
  height: 20px;
  background: var(--el-border-color);
  transition: all 0.3s;
}

.connector-arrow {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-bg-color);
  border: 2px solid var(--el-border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  transition: all 0.3s;
}

.flow-connector.active .connector-line {
  background: var(--el-color-success);
}

.flow-connector.active .connector-arrow {
  border-color: var(--el-color-success);
  color: var(--el-color-success);
}

/* Integration Cards */
.integration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.integration-card {
  border-radius: 12px;
  transition: all 0.2s;
}

.integration-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.integration-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.integration-info p {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

/* Deep Styles for Tab Content */
.step-content :deep(.section-container),
.step-content :deep(.target-container),
.step-content :deep(.trigger-container),
.step-content :deep(.trigger-response-tab),
.step-content :deep(.data-manipulation-tab) {
  margin-bottom: 0;
  border: none;
  padding: 0;
  background: transparent;
  box-shadow: none;
}

.step-content :deep(.el-alert.mb-3) {
  margin-bottom: 16px;
}

.step-content :deep(.section-container + .section-container) {
  margin-top: 20px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .workflow-container {
    padding: 12px;
  }
  
  .workflow-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .workflow-controls {
    justify-content: space-between;
  }
  
  .step-header {
    padding: 16px;
  }
  
  .step-info h3 {
    font-size: 18px;
  }
  
  .integration-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .integration-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .workflow-title h2 {
    font-size: 20px;
  }
  
  .step-indicator {
    width: 40px;
    height: 40px;
  }
  
  .step-number {
    font-size: 16px;
  }
  
  .minimap-steps {
    flex-wrap: wrap;
  }
}
</style>
