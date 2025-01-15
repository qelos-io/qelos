
<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { IIntegration } from '@qelos/global-types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import SaveButton from '@/modules/core/components/forms/SaveButton.vue';
import SourceSelector from './SourceSelector.vue';
import { useDispatcher } from '../core/compositions/dispatcher';
import { useSubmitting } from '../core/compositions/submitting';
import { useIntegrationKinds } from '@/modules/integrations/compositions/integration-kinds';
import { Source } from '@/modules/integrations/SourceSelector.vue';
import integrationsService from '@/services/integrations-service';

const route = useRoute();
const kind = route.params.kind as string;

// Mock data for integrations
const mockData: IIntegration[] = [
  {
    _id: '1',
    tenant: 'currentTenant',
    plugin: 'OpenAI Plugin',
    user: 'user1',
    kind: ['blueprint'],
    trigger: {
      source: 'qelos',
      operation: 'blueprint-created',
      details: { metadata: 'Blueprint created metadata' },
    },
    target: {
      source: 'qelos',
      operation: 'create-entity',
      details: { prompt: 'Create a new entity in another blueprint using blueprint data.' },
    },
    created: new Date(),
  },
  {
    _id: '4',
    tenant: 'currentTenant',
    plugin: 'OpenAI Plugin',
    user: 'user4',
    kind: ['users'],
    trigger: {
      source: 'qelos',
      operation: 'user-updated',
      details: { metadata: 'Metadata for user update event' },
    },
    target: {
      source: 'openai',
      operation: 'update-profile',
      details: { prompt: 'Update the user profile with the new information.' },
    },
    created: new Date(),
  },
];

// Fetch operations with useDispatcher using mock data
const { result: operations, loading, error } = useDispatcher(() => Promise.resolve(mockData));

// Fetch operations using integrationsService.getAll({ kind })
// const { result: operations, loading, error } = useDispatcher(() => { integrationsService.getAll({ kind }) })

// useSubmitting for saving operations with integrated validation
const { submit, submitting } = useSubmitting(
  async (operation: IIntegration) => {
    // Validation before saving
     if (!operation.trigger.source) {
      throw new Error('Trigger source is required.');
    }
    if (!operation.trigger.operation) {
      throw new Error('Trigger operation is required.');
    }
    if (!operation.target.operation) {
      throw new Error('Target operation is required.');
    }
    if (!operation.target.details.prompt) {
      throw new Error('Prompt is required for OpenAI.');
    }

    // Simulate API update MOCKDATA
    const index = mockData.findIndex((item) => item._id === operation._id);
    if (index !== -1) {
      mockData[index] = { ...operation };
    }
    return Promise.resolve();

    // API update call
    //  await integrationsService.update(operation._id, operation);
  },
  {
    success: 'Operation saved successfully!',
    error: (err) => err.message || 'Failed to save operation.',
  }
);

// Use integration kinds to populate sources
const integrationKinds = useIntegrationKinds();
const triggerSources: Source[] = Object.values(integrationKinds).map((item) => ({
  value: item.kind,
  logo: item.logo,
  name: item.name,
}));

const targetSources: Source[] = Object.values(integrationKinds).map((item) => ({
  value: item.kind,
  logo: item.logo,
  name: item.name,
}));

// Form state
const selectedTriggerSource = ref<string>('');
const selectedTriggerOperation = ref<string>('');
const selectedTargetSource = ref<string>('');
const selectedTargetOperation = ref<string>('');
const systemPrompt = ref<string>('');

// Helper functions for operations
const getTargetOperations = (source: string) => {
  const targetOperationsMap: Record<string, { value: string; label: string }[]> = {
    qelos: [
      { value: 'create', label: 'Create' },
      { value: 'update', label: 'Update' },
      { value: 'delete', label: 'Delete' },
    ],
    openai: [
      { value: 'generate-text', label: 'Generate Text' },
      { value: 'update-profile', label: 'Update Profile' },
    ],
    supabase: [
      { value: 'create', label: 'Create' },
      { value: 'update', label: 'Update' },
    ],
    n8n: [
      { value: 'trigger', label: 'Trigger' },
      { value: 'execute', label: 'Execute' },
    ],
    smtp: [
      { value: 'trigger', label: 'Trigger' },
      { value: 'execute', label: 'Execute' },
    ],
  };
  return targetOperationsMap[source] || [];
};

const getTriggerOperations = (source: string) => {
  const triggerOperationsMap: Record<string, { value: string; label: string }[]> = {
    qelos: [
      { value: 'create', label: 'Create' },
      { value: 'update', label: 'Update' },
      { value: 'delete', label: 'Delete' },
    ],
    openai: [
      { value: 'generate-text', label: 'Generate Text' },
      { value: 'update-profile', label: 'Update Profile' },
    ],
    supabase: [
      { value: 'create', label: 'Create' },
      { value: 'update', label: 'Update' },
    ],
    n8n: [
      { value: 'trigger', label: 'Trigger' },
      { value: 'execute', label: 'Execute' },
    ],
    smtp: [
      { value: 'trigger', label: 'Trigger' },
      { value: 'execute', label: 'Execute' },
    ],
  };
  return triggerOperationsMap[source] || [];
};

// Watch selected source changes
watch(selectedTriggerSource, () => {
  selectedTriggerOperation.value = '';
});

watch(selectedTargetSource, () => {
  selectedTargetOperation.value = '';
});

// Save operation
const saveOperation = async (operation: IIntegration) => {
  await submit(operation);
};
</script>

<template>
  <div>
    <h1>{{ $t('Integration Operations') }}</h1>
    <el-tabs type="card">
      <el-tab-pane label="Trigger">
        <div class="form-row-group">
          <SourceSelector v-model="selectedTriggerSource" :sources="triggerSources" />
          <el-row v-if="selectedTriggerSource">
            <el-col :span="24">
              <el-form-item label="Trigger Operation">
                <el-select v-model="selectedTriggerOperation" placeholder="Select Operation">
                  <el-option v-for="operation in getTriggerOperations(selectedTriggerSource)" :key="operation.value"
                    :label="operation.label" :value="operation.value" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
      <el-tab-pane label="Target">
        <div class="form-row-group">
          <SourceSelector v-model="selectedTargetSource" :sources="targetSources" />
          <el-row v-if="selectedTargetSource">
            <el-col :span="24">
              <el-form-item label="Target Operation">
                <el-select v-model="selectedTargetOperation" placeholder="Select Operation">
                  <el-option v-for="operation in getTargetOperations(selectedTargetSource)" :key="operation.value"
                    :label="operation.label" :value="operation.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <FormInput label="System Prompt" type="textarea" v-model="systemPrompt" />
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
    </el-tabs>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else>
      <h2>Operations</h2>
      <div v-for="operation in operations" :key="operation._id" class="operation-card">
        <h3>{{ operation.plugin }}</h3>
        <p><strong>Trigger:</strong> {{ operation.trigger.source }} - {{ operation.trigger.operation }}</p>
        <p><strong>Target:</strong> {{ operation.target.source }} - {{ operation.target.operation }}</p>
        <SaveButton @click="saveOperation(operation)" :loading="submitting" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.operation-card {
  border: 1px solid #ddd;
  padding: 16px;
  margin-bottom: 16px;
  background-color: #f9f9f9;
}
</style>
