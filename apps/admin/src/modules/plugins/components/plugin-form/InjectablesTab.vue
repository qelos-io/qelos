<template>
  <div class="tab-content" role="region" :aria-label="$t('Custom code injection configuration')">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header" id="code-injection-section">
          <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
          <span>{{ $t('Custom Code Injection') }}</span>
        </div>
      </template>
      <p class="card-description">{{$t('The ability to inject any custom HTML / CSS / JS to all the pages.')}}</p>
      
      <div 
        v-if="plugin.injectables && plugin.injectables.length > 0"
        role="list"
        :aria-label="$t('Custom code injections')">
        <div 
          v-for="(inject, index) in plugin.injectables" 
          class="injectable-item" 
          :key="index"
          role="listitem"
          :aria-label="inject.name || `Injectable ${index + 1}`">
          <FormRowGroup role="group" :aria-label="`Configuration for ${inject.name || 'injectable ' + (index + 1)}`">
            <FormInput 
              class="flex-0" 
              type="switch" 
              v-model="inject.active"
              :aria-label="`Toggle ${inject.name || 'injectable'} active status`"
              :id="`injectable-switch-${index}`"/>
            <FormInput 
              title="Name" 
              v-model="inject.name"
              :aria-label="$t('Injectable name')"
              :id="`injectable-name-${index}`"/>
            <FormInput 
              title="Description" 
              v-model="inject.description"
              :aria-label="$t('Injectable description')"
              :id="`injectable-description-${index}`"/>
            <div class="flex-0 remove-row">
              <RemoveButton 
                @click="removeInjectable(index)"
                :aria-label="`Remove ${inject.name || 'injectable ' + (index + 1)}`"/>
            </div>
          </FormRowGroup>
          <div 
            class="monaco-container" 
            v-if="inject.active"
            role="group"
            :aria-label="`HTML code editor for ${inject.name || 'injectable ' + (index + 1)}`">
            <label :for="`monaco-editor-${index}`" class="sr-only">
              {{ $t('HTML code for {name}', { name: inject.name || 'injectable ' + (index + 1) }) }}
            </label>
            <Monaco 
              :id="`monaco-editor-${index}`"
              v-model="inject.html" 
              language="html"
              :aria-label="`HTML code editor for ${inject.name || 'injectable'}`"/>
          </div>
        </div>
      </div>
      
      <div 
        v-else 
        class="empty-state" 
        role="status" 
        aria-live="polite">
        <p>{{ $t('No custom code injections configured. Click below to add your first one.') }}</p>
      </div>
      
      <AddMore 
        @click="addInjectable" 
        class="add-more-button"
        :aria-label="$t('Add new code injection')"/>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import AddMore from '@/modules/core/components/forms/AddMore.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import { IPlugin } from '@/services/types/plugin';

const props = defineProps<{
  plugin: Partial<IPlugin>;
}>();

function addInjectable() {
  if (!props.plugin.injectables) {
    props.plugin.injectables = [];
  }
  props.plugin.injectables.push({ 
    name: '', 
    description: '', 
    active: true, 
    html: '<!--Custom HTML-->' 
  });
}

function removeInjectable(index: number) {
  props.plugin.injectables?.splice(index, 1);
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
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
}

.card-description {
  margin-bottom: 1.5rem;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.injectable-item {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: var(--el-bg-color-page);
}

.monaco-container {
  margin-top: 1rem;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  overflow: hidden;
}

.add-more-button {
  margin-top: 1rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 8px;
  margin-bottom: 1rem;
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

:deep(.el-switch:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
  border-radius: 12px;
}

.injectable-item:focus-within {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 0 0 3px var(--el-color-primary-light-9);
}

/* Monaco editor focus state */
.monaco-container:focus-within {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Ensure all interactive elements have visible focus */
:deep(*:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
</style>
