<template>
  <div class="tab-content" role="group" :aria-label="$t('Plugin basic information')">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'info-circle']" /></el-icon>
          <span>{{ $t('Plugin Details') }}</span>
        </div>
      </template>
      <el-form 
        :model="plugin"
        :rules="validationRules"
        ref="pluginDetailsForm"
        label-position="top"
        @submit.prevent>
        <FormRowGroup role="group" :aria-label="$t('Plugin identification fields')">
          <FormInput 
            title="Name" 
            v-model="plugin.name" 
            required
            :aria-label="$t('Plugin name')"/>
          <FormInput 
            title="Description" 
            v-model="plugin.description"
            :aria-label="$t('Plugin description')"/>
        </FormRowGroup>
      </el-form>
    </el-card>
    
    <el-card class="settings-card">
      <template #header>
        <div class="card-header">
          <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'cloud-download']" /></el-icon>
          <span>{{ $t('Quick Remote Load') }}</span>
        </div>
      </template>
      <el-form 
        :model="plugin"
        :rules="validationRules"
        ref="remoteLoadForm"
        label-position="top"
        @submit.prevent>
        <FormRowGroup role="group" :aria-label="$t('Remote plugin configuration')">
          <FormInput 
            title="Manifest URL" 
            label="required" 
            v-model="plugin.manifestUrl"
            aria-describedby="manifestUrl-help"
            :aria-label="$t('Plugin manifest URL')"/>
          <FormInput 
            title="Plugin API Path" 
            label="Leave empty to auto-set" 
            v-model="plugin.apiPath"
            aria-describedby="apiPath-help"
            :aria-label="$t('Plugin API path')"/>
        </FormRowGroup>
        <span id="manifestUrl-help" class="sr-only">{{ $t('Enter the URL to the plugin manifest JSON file') }}</span>
        <span id="apiPath-help" class="sr-only">{{ $t('If left empty, the API path will be automatically generated from the plugin name') }}</span>
      </el-form>
      <div class="refresh-button-container">
        <el-button 
          type="primary" 
          class="refresh-button" 
          @click="refreshPluginFromManifest"
          :aria-label="$t('Load plugin configuration from manifest URL')">
          <el-icon aria-hidden="true">
            <font-awesome-icon :icon="['fas', 'sync']" />
          </el-icon>
          <span>{{ $t('Refresh from Manifest') }}</span>
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { IPlugin } from '@/services/types/plugin';

const props = defineProps<{
  plugin: Partial<IPlugin>;
}>();

const emit = defineEmits<{
  (e: 'refreshManifest'): void;
}>();

const pluginDetailsForm = ref<FormInstance>();
const remoteLoadForm = ref<FormInstance>();

// Validation rules for form fields
const validationRules: FormRules = {
  name: [
    { required: true, message: 'Plugin name is required', trigger: 'blur' }
  ],
  manifestUrl: [
    { type: 'url' as const, message: 'Please enter a valid URL', trigger: 'blur' }
  ]
};

function refreshPluginFromManifest() {
  emit('refreshManifest');
}
</script>

<style scoped>
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

/* Ensure focus states are visible */
:deep(.el-input__wrapper:focus-within) {
  box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
}

:deep(.el-input__wrapper:focus-within:hover) {
  box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
}

/* Enhanced focus for buttons */
.refresh-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}
</style>
