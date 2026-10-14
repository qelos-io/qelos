<template>
  <div class="attention-row" role="status">
    <font-awesome-icon :icon="['fas', 'wand-magic-sparkles']" class="icon" aria-hidden="true" />
    <p class="text">
      <strong>{{ $t('Connect an AI provider') }}</strong>
      <span>{{ $t('OpenAI connection is required for AI features') }}</span>
    </p>
    <el-input v-if="showInput" v-model="token" class="key" type="password" show-password :placeholder="$t('Paste your OpenAI key and press Enter')" :aria-label="$t('OpenAI key')" @keyup.enter="addToken" @keyup.esc="showInput = false" />
    <el-button v-else type="primary" plain @click="showInput = true">{{ $t('Add OpenAI Key') }}</el-button>
  </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import { useIntegrationSourcesStore } from '@/modules/integrations/store/integration-sources';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import integrationSourcesService from '@/services/apis/integration-sources-service';

const showInput = ref(false)
const token = ref('');

const integrationSourcesStore = useIntegrationSourcesStore()

const { submit: saveConnection } = useSubmitting(
  async (formData: any) => {
    const savedData = await integrationSourcesService.create({
      kind: 'openai',
      name: 'OpenAI',
      labels: [],
      metadata: {},
      authentication: {
        token: token.value
      }
    });
    await integrationSourcesStore.retry();
    return savedData;
  },
  {
    success: 'Connection created successfully',
    error: 'Failed to save connection'
  },
  () => (showInput.value = false)
);

const addToken = () => {
  saveConnection(token.value)
}

</script>
<style scoped lang="scss">
.attention-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--el-color-warning) 45%, var(--surface));
  border-radius: calc(var(--border-radius, 6px) + 4px);
  background: color-mix(in srgb, var(--el-color-warning) 10%, var(--surface));
}

.icon {
  flex: none;
  color: var(--el-color-warning);
}

.text {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 0 10px;
  min-inline-size: 0;
  margin: 0;
  text-align: start;

  span {
    color: var(--el-text-color-secondary);
    font-size: 0.9rem;
  }
}

.key {
  flex: 1;
  max-inline-size: 360px;
}

@media (max-width: 639px) {
  .attention-row {
    flex-wrap: wrap;
  }

  .key {
    flex-basis: 100%;
    max-inline-size: none;
  }
}
</style>
