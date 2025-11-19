<script setup lang="ts">
import TriggerTab from '@/modules/integrations/components/tabs/TriggerTab.vue';
import DataManipulationTab from '@/modules/integrations/components/tabs/DataManipulationTab.vue';
import TargetTab from '@/modules/integrations/components/tabs/TargetTab.vue';
import TriggerResponseTab from '@/modules/integrations/components/tabs/TriggerResponseTab.vue';
import FunctionToolsTab from '@/modules/integrations/components/tabs/FunctionToolsTab.vue';

const trigger = defineModel<any>('trigger', { required: true });
const target = defineModel<any>('target', { required: true });
const dataManipulation = defineModel<any>('dataManipulation', { required: true });

const props = defineProps<{ integrationId?: string; isChatCompletionIntegration: boolean; hasSavedIntegration: boolean }>();
</script>

<template>
  <el-tabs class="standard-integration-tabs">
    <el-tab-pane :label="$t('Trigger')">
      <TriggerTab v-model="trigger" :integration-id="props.integrationId" />
    </el-tab-pane>
    <el-tab-pane :label="$t('Data Manipulation')">
      <DataManipulationTab v-model="dataManipulation" />
    </el-tab-pane>
    <el-tab-pane :label="$t('Target')">
      <TargetTab v-model="target" :integration-id="props.integrationId" />
    </el-tab-pane>
    <el-tab-pane :label="$t('Trigger Response')">
      <TriggerResponseTab v-model="target" :integration-id="props.integrationId" />
    </el-tab-pane>
    <el-tab-pane v-if="props.isChatCompletionIntegration" :label="$t('Function Tools')">
      <FunctionToolsTab v-if="props.hasSavedIntegration" :integration-id="props.integrationId" />
      <el-alert v-else :title="$t('Please save the integration first')" type="warning" show-icon />
    </el-tab-pane>
  </el-tabs>
</template>

<style scoped>
.standard-integration-tabs :deep(.el-alert) {
  margin-top: 12px;
}
</style>
