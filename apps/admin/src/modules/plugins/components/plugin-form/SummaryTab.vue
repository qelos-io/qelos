<template>
  <div class="tab-content" role="region" :aria-label="$t('Plugin JSON configuration')">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header" id="plugin-json-section">
          <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
          <span>{{ $t('Plugin JSON') }}</span>
        </div>
      </template>
      <p class="card-description" id="json-editor-description">
        {{ $t('View and edit the raw JSON configuration for this plugin. Changes made here will update the plugin configuration.') }}
      </p>
      <div 
        class="monaco-container" 
        role="group" 
        aria-labelledby="plugin-json-section"
        :aria-describedby="'json-editor-description'">
        <label for="json-editor" class="sr-only">
          {{ $t('Plugin JSON configuration editor') }}
        </label>
        <Monaco 
          id="json-editor"
          ref="editor" 
          :model-value="pluginJson" 
          @change="updateJson" 
          language="json" 
          class="monaco-editor"
          :aria-label="$t('JSON code editor for plugin configuration')"
          role="textbox"
          aria-multiline="true"/>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { IPlugin } from '@/services/types/plugin';

const props = defineProps<{
  plugin: Partial<IPlugin>;
}>();

const emit = defineEmits<{
  (e: 'updateJson', value: string): void;
}>();

const editor = ref<InstanceType<typeof Monaco> | null>(null);

const pluginJson = computed(() => {
  try {
    return JSON.stringify(props.plugin, null, 2);
  } catch (e) {
    console.error('Failed to stringify plugin:', e);
    return '{}';
  }
});

watch(() => pluginJson.value, (newValue) => {
  if (editor.value && editor.value.getMonaco) {
    const currentValue = editor.value.getMonaco().getValue();
    if (currentValue !== newValue) {
      editor.value.getMonaco().setValue(newValue);
    }
  }
});

function updateJson(value: string) {
  emit('updateJson', value);
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
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
}

.card-description {
  margin-bottom: 1rem;
  padding: 0 1.25rem;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  font-size: 0.875rem;
}

.monaco-container {
  flex: 1;
  min-height: 400px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
  margin: 0 1.25rem 1.25rem 1.25rem;
}

.monaco-editor {
  height: 100%;
  min-height: 400px;
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
.monaco-container:focus-within {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
  border-radius: 4px;
  border-color: var(--el-color-primary);
}

/* Monaco editor focus state */
:deep(.monaco-editor:focus),
:deep(.monaco-editor .monaco-editor-background:focus) {
  outline: none;
}

/* Ensure keyboard focus is visible */
:deep(.monaco-editor .inputarea) {
  outline: none;
}

:deep(.monaco-editor.focused) {
  outline: none;
}

/* Enhanced focus for the editor container */
.monaco-container:has(.monaco-editor.focused) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px var(--el-color-primary-light-9);
}

/* Ensure all interactive elements have visible focus */
:deep(*:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
</style>
