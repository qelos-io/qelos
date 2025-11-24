<template>
<el-alert type="warning" show-icon class="alert" :show-close="false">
  <div class="flex-row">
    <div class="flex-2">{{ $t('OpenAI connection is required for AI features') }}</div>
    <el-input class="flex-1" v-model="token" type="password" v-if="showInput" placeholder="Enter to save" @keyup.enter="addToken" />
    <el-button v-else @click="showInput = true">{{ $t('Add OpenAI Key') }}</el-button>
  </div>
</el-alert>
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
<style scoped>
.alert :deep(:is(.el-alert__description, .el-alert__content)) {
  width: 100%;
  padding-inline: 8px;
}
.flex-row {
  width: 100%;
  align-items: center;
  justify-content: space-between;
}
</style>