<template>
  <div class="tab-content">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon><font-awesome-icon :icon="['fas', 'window-restore']" /></el-icon>
          <span>{{ $t('Micro-Frontend Configuration') }}</span>
        </div>
      </template>
      <p class="card-description">{{ $t('Configure micro-frontends that will be integrated into the platform.') }}</p>
      <div class="micro-frontends-container">
        <EditPluginMicroFrontends v-if="plugin" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { provide, reactive } from 'vue';
import EditPluginMicroFrontends from '@/modules/plugins/components/EditPluginMicroFrontends.vue';
import { IPlugin } from '@/services/types/plugin';

const props = defineProps<{
  plugin: Partial<IPlugin>;
}>();

// Create a reactive copy of the plugin and provide it to child components
const edit = reactive<Partial<IPlugin>>(props.plugin || {});

// Ensure microFrontends array exists
if (!edit.microFrontends) {
  edit.microFrontends = [];
}

// Provide the edit object to child components
provide('edit', edit);
provide('plugin', edit);
</script>

<style scoped>
.tab-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 1rem;
}

.settings-card {
  margin-bottom: 1rem;
  transition: all 0.3s ease;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
}

.card-description {
  margin-bottom: 1.5rem;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.micro-frontends-container {
  width: 100%;
}
</style>
