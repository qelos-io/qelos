<script lang="ts" setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useIntegrationsStore } from '../../store/integrations';
import { useFlowCanvasStore } from '../../store/flow-canvas';
import FlowCanvas from './FlowCanvas.vue';

const router = useRouter();
const integrations = useIntegrationsStore();
const canvas = useFlowCanvasStore();

// the canvas store is shared with the Automations page: start from the full picture, not that page's filters
onMounted(() => {
  canvas.allowedIds = null;
  canvas.select(null);
});

const isEmpty = computed(() => integrations.loaded && !(integrations.integrations || []).length);
const create = (type: 'agent' | 'workflow') => router.push({ name: 'integration-new', query: { type } });
</script>

<template>
  <section class="tab">
    <header class="head">
      <p>{{ $t('How your integrations start each other. Select one to follow its flow.') }}</p>
      <el-button @click="router.push({ name: 'integrations' })">{{ $t('Manage integrations') }}</el-button>
    </header>

    <el-skeleton v-if="!integrations.loaded" :rows="6" animated />

    <div v-else-if="isEmpty" class="empty">
      <h2>{{ $t('No integrations yet') }}</h2>
      <p>{{ $t('An integration connects something that happens (a trigger) to something that should follow (an action). Start with an AI agent or build your own workflow.') }}</p>
      <div class="actions">
        <el-button type="primary" @click="create('agent')">{{ $t('Create an AI agent') }}</el-button>
        <el-button @click="create('workflow')">{{ $t('Create a workflow') }}</el-button>
      </div>
    </div>

    <FlowCanvas v-else />
  </section>
</template>

<style scoped lang="scss">
.tab {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 20px 24px;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;

  p {
    margin: 0;
    color: var(--el-text-color-secondary);
    text-align: start;
  }
}

.empty {
  padding: 40px 20px;
  border: 1px dashed var(--el-border-color);
  border-radius: calc(var(--border-radius, 6px) + 4px);
  text-align: center;

  h2 {
    margin: 0 0 6px;
    padding: 0;
    font-size: 1.2rem;
  }

  p {
    max-inline-size: 520px;
    margin: 0 auto 16px;
    color: var(--el-text-color-secondary);
    text-align: center;
  }
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

@media (max-width: 639px) {
  .tab {
    padding-inline: 12px;
  }
}
</style>
