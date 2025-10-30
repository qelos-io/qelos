<script setup lang="ts">
import { Tools, Document, ChatDotRound, MagicStick } from '@element-plus/icons-vue';
import { storeToRefs } from 'pinia';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import { useIntegrationsStore } from '@/modules/integrations/store/integrations';
import { IntegrationSourceKind, QelosTriggerOperation } from '@qelos/global-types';
import { computed } from 'vue';
import FunctionToolsTab from '@/modules/integrations/components/tabs/FunctionToolsTab.vue';

const props = defineProps<{
  integrationId?: string;
}>();

const { blueprints } = storeToRefs(useBlueprintsStore());
const integrationsStore = useIntegrationsStore();

const agents = computed(() => integrationsStore.integrations?.filter(integration => 
  integration._id !== props.integrationId && 
  integration.kind[0] === IntegrationSourceKind.Qelos && 
  integration.trigger.operation === QelosTriggerOperation.chatCompletion
));

const ingestedBlueprints = defineModel<string[]>('ingestedBlueprints', { required: true });
const ingestedAgents = defineModel<string[]>('ingestedAgents', { required: true });
</script>

<template>
  <div class="agent-tools-step">
    <div class="step-header">
      <el-icon class="step-icon"><Tools /></el-icon>
      <div>
        <h3>{{ $t('Tools & Functions') }}</h3>
        <p class="step-description">{{ $t('Enhance your agent with function calling capabilities') }}</p>
      </div>
    </div>

    <el-alert type="info" :closable="false" class="mb-4">
      {{ $t('Function tools allow your AI agent to perform actions and access external data sources') }}
    </el-alert>

    <!-- Ingest Blueprints as Tools -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <el-icon><Document /></el-icon>
          <span>{{ $t('Blueprint Tools') }}</span>
        </div>
      </template>
      <p class="card-description">{{ $t('Select blueprints to expose as function tools') }}</p>
      <el-select
        v-model="ingestedBlueprints"
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
    </el-card>

    <!-- Ingest Other Agents -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <el-icon><ChatDotRound /></el-icon>
          <span>{{ $t('Agent Communication') }}</span>
        </div>
      </template>
      <p class="card-description">{{ $t('Allow this agent to communicate with other agents') }}</p>
      <el-select
        v-model="ingestedAgents"
        multiple
        filterable
        collapse-tags-tooltip
        :placeholder="$t('Select agents')"
        class="w-full"
      >
        <el-option
          v-for="agent in agents"
          :key="agent._id"
          :label="agent.trigger.details?.name || 'Unnamed Agent'"
          :value="agent._id"
        />
      </el-select>
    </el-card>

    <!-- Custom Function Tools -->
    <el-card v-if="integrationId">
      <template #header>
        <div class="card-header">
          <el-icon><MagicStick /></el-icon>
          <span>{{ $t('Custom Function Tools') }}</span>
        </div>
      </template>
      <FunctionToolsTab :integration-id="integrationId" />
    </el-card>
    <el-alert v-else type="warning" :closable="false" show-icon>
      {{ $t('Save the integration first to configure custom function tools') }}
    </el-alert>
  </div>
</template>

<style scoped>
.agent-tools-step {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mb-4 {
  margin-bottom: 16px;
}

.step-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, var(--el-fill-color-light) 100%);
  border-radius: 8px;
  border-left: 4px solid var(--el-color-primary);
}

.step-icon {
  font-size: 32px;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.step-header h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.step-description {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.card-description {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.w-full {
  width: 100%;
}

:deep(.el-card__header) {
  padding: 12px 16px;
  background-color: var(--el-fill-color-light);
}

:deep(.el-card__body) {
  padding: 16px;
}
</style>
