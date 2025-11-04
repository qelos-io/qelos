<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { IntegrationSourceKind } from '@qelos/global-types';
import { computed } from 'vue';

const store = useIntegrationSourcesStore();

const openAISources = computed(() => {
  return store.result?.filter(s => s.kind === IntegrationSourceKind.OpenAI) || [];
});

const availableModels = [
  // GPT-5 Series (Future)
  { label: 'GPT-5', value: 'gpt-5', description: 'Next generation flagship model' },
  { label: 'GPT-5 Turbo', value: 'gpt-5-turbo', description: 'GPT-5 optimized version' },
  { label: 'GPT-5 Turbo Preview', value: 'gpt-5-turbo-preview', description: 'GPT-5 Turbo preview' },

  // GPT-4o Series (Latest)
  { label: 'GPT-4o', value: 'gpt-4o', description: 'Most capable, multimodal flagship model' },
  { label: 'GPT-4o Mini', value: 'gpt-4o-mini', description: 'Affordable and intelligent small model' },
  { label: 'GPT-4o Nano', value: 'gpt-4o-nano', description: 'Ultra-efficient, lightweight model' },

  // GPT-4.1 Series
  { label: 'GPT-4.1', value: 'gpt-4.1', description: 'Enhanced GPT-4 model' },
  { label: 'GPT-4.1 Turbo', value: 'gpt-4.1-turbo', description: 'GPT-4.1 optimized version' },
  { label: 'GPT-4.1 Preview', value: 'gpt-4.1-preview', description: 'GPT-4.1 preview version' },

  // GPT-4 Turbo Series
  { label: 'GPT-4 Turbo', value: 'gpt-4-turbo', description: 'Latest GPT-4 Turbo' },
  { label: 'GPT-4 Turbo Preview', value: 'gpt-4-turbo-preview', description: 'GPT-4 Turbo preview' },

  // GPT-4 Series
  { label: 'GPT-4', value: 'gpt-4', description: 'Latest GPT-4 model' },
  { label: 'GPT-4 32k', value: 'gpt-4-32k', description: '32k context window' },

  // GPT-3.5 Turbo Series
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', description: 'Latest GPT-3.5 Turbo' },
  
  // GPT-3.5 Base
  { label: 'GPT-3.5 Turbo Instruct', value: 'gpt-3.5-turbo-instruct', description: 'Instruction-following model' },
  
  // O1 Series (Reasoning models)
  { label: 'O1', value: 'o1', description: 'Advanced reasoning model' },
  { label: 'O1 Preview', value: 'o1-preview', description: 'O1 preview version' },
  { label: 'O1 Mini', value: 'o1-mini', description: 'Faster, cheaper reasoning model' },
];

const selectedOpenAISource = defineModel<string>('selectedOpenAISource', { required: true });
const systemMessage = defineModel<string>('systemMessage', { required: true });
const model = defineModel<string>('model', { required: true });
const temperature = defineModel<number>('temperature', { required: true });
const maxTokens = defineModel<number>('maxTokens', { required: true });
</script>

<template>
  <div class="agent-configuration-step">
    <div class="step-header">
      <el-icon class="step-icon"><Setting /></el-icon>
      <div>
        <h3>{{ $t('AI Configuration') }}</h3>
        <p class="step-description">{{ $t('Configure the AI model, behavior, and response settings') }}</p>
      </div>
    </div>

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
      <template #extra>
        <small class="form-hint">{{ $t('Select from the list or type a custom model name') }}</small>
      </template>
    </el-form-item>

    <el-form-item :label="$t('System Message')" required>
      <el-input
        v-model="systemMessage"
        type="textarea"
        :rows="8"
        :placeholder="$t('You are a helpful assistant that...')"
      />
      <template #extra>
        <small class="form-hint">{{ $t('Define the agent\'s personality, role, and behavior') }}</small>
      </template>
    </el-form-item>

    <el-divider content-position="left">{{ $t('Advanced Settings') }}</el-divider>

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
  </div>
</template>

<style scoped>
.agent-configuration-step {
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

.form-hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  margin-top: 4px;
  display: block;
  line-height: 1.4;
}

.w-full {
  width: 100%;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}

.slider-labels small {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.model-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.model-description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.3;
}
</style>
