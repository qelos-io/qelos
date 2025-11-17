<script setup lang="ts">
import { computed } from 'vue';
import { ChatDotRound } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const props = defineProps<{
  integrationId?: string;
}>();

const agentName = defineModel<string>('agentName', { required: true });
const agentDescription = defineModel<string>('agentDescription', { required: true });
const recordThread = defineModel<boolean>('recordThread', { required: true });

const getCompletionUrl = computed(() => {
  const baseUrl = `/api/ai/${props.integrationId}/chat-completion`;
  return recordThread.value ? `${baseUrl}/[threadId]` : baseUrl;
});

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('Copied to clipboard');
  });
};
</script>

<template>
  <div class="agent-identity-step">
    <div class="step-header">
      <el-icon class="step-icon"><ChatDotRound /></el-icon>
      <div>
        <h3>{{ $t('Agent Identity') }}</h3>
        <p class="step-description">{{ $t('Define your AI agent\'s name, description, and endpoint configuration') }}</p>
      </div>
    </div>

    <el-form-item :label="$t('Agent Name')" required>
      <el-input
        v-model="agentName"
        :placeholder="$t('e.g., Customer Support Agent')"
        size="large"
      />
      <template #extra>
        <small class="form-hint">{{ $t('A clear, descriptive name for your AI agent') }}</small>
      </template>
    </el-form-item>

    <el-form-item :label="$t('Agent Description')">
      <el-input
        v-model="agentDescription"
        type="textarea"
        :rows="3"
        :placeholder="$t('Describe what this agent does...')"
      />
      <template #extra>
        <small class="form-hint">{{ $t('Optional description to help identify this agent') }}</small>
      </template>
    </el-form-item>

    <el-form-item>
      <el-checkbox v-model="recordThread">
        {{ $t('Record conversation threads') }}
      </el-checkbox>
      <template #extra>
        <small class="form-hint">{{ $t('Enable to maintain conversation history across multiple requests') }}</small>
      </template>
    </el-form-item>

    <div v-if="integrationId" class="url-section">
      <el-divider />
      <h4>{{ $t('API Endpoint') }}</h4>
      <el-input :value="getCompletionUrl" readonly dir="ltr">
        <template #append>
          <el-button @click="copyToClipboard(getCompletionUrl)">
            {{ $t('Copy') }}
          </el-button>
        </template>
      </el-input>
      <small class="form-hint">{{ $t('Use this URL to access your chat completion API') }}</small>
    </div>
  </div>
</template>

<style scoped>
.agent-identity-step {
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

.url-section {
  margin-top: 24px;
  padding: 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

.url-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
