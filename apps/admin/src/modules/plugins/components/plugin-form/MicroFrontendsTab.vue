<template>
  <div class="tab-content" role="region" :aria-label="$t('Micro-frontends configuration')">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header" id="micro-frontends-section">
          <div class="header-left">
            <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'window-restore']" /></el-icon>
            <span>{{ $t('Micro-Frontends Configuration') }}</span>
          </div>
          <el-button 
            type="primary" 
            @click="addNewMicroFrontend" 
            class="add-button"
            :aria-label="$t('Add new micro-frontend')">
            <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'plus']" /></el-icon>
            <span class="button-text">Add MFE</span>
          </el-button>
        </div>
      </template>
      <div 
        class="micro-frontends-container" 
        role="group" 
        :aria-labelledby="'micro-frontends-section'"
        :aria-describedby="plugin && plugin.microFrontends && plugin.microFrontends.length > 0 ? 'mfe-count' : 'mfe-empty'">
        <span id="mfe-count" class="sr-only" v-if="plugin && plugin.microFrontends && plugin.microFrontends.length > 0">
          {{ $t('{count} micro-frontend(s) configured', { count: plugin.microFrontends.length }) }}
        </span>
        <span id="mfe-empty" class="sr-only" v-else>
          {{ $t('No micro-frontends configured yet') }}
        </span>
        <EditPluginMicroFrontends ref="mfeComponent" v-if="plugin" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { provide, reactive, ref } from 'vue';
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

// Reference to the child component
const mfeComponent = ref();

// Function to add new micro frontend
function addNewMicroFrontend() {
  if (mfeComponent.value) {
    mfeComponent.value.addNewMicroFrontend();
  }
}
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
  justify-content: space-between;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  width: 100%;
}

.card-description {
  margin-bottom: 1.5rem;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.micro-frontends-container {
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.add-button {
  margin-left: auto;
}

.button-text {
  margin-left: 0.5rem;
}

/* Screen reader only class for assistive text */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focus states for accessibility */
:deep(.el-button:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

:deep(.el-input:focus-within),
:deep(.el-select:focus-within),
:deep(.el-textarea:focus-within) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

:deep(.el-card:focus-within) {
  outline: none;
}

/* Ensure all interactive elements have visible focus */
:deep(*:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
</style>
