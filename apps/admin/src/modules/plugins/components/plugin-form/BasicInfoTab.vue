<template>
  <div 
    class="tab-content" 
    role="region" 
    tabindex="-1"
    :aria-label="$t('Plugin basic information')">
    <el-card class="settings-card">
      <template #header>
        <div class="card-header" id="plugin-details-section">
          <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'info-circle']" /></el-icon>
          <span>{{ $t('Plugin Details') }}</span>
        </div>
      </template>
      <p class="card-description" id="plugin-details-description">
        {{ $t('Configure the basic information for your plugin including name and description.') }}
      </p>
      <el-form 
        :model="plugin"
        :rules="validationRules"
        ref="pluginDetailsForm"
        label-position="top"
        @submit.prevent
        aria-labelledby="plugin-details-section"
        :aria-describedby="'plugin-details-description'">
        <FormRowGroup role="group" :aria-label="$t('Plugin identification fields')">
          <FormInput 
            id="plugin-name-input"
            title="Name" 
            v-model="plugin.name" 
            required
            :aria-label="$t('Plugin name')"
            :aria-required="true"/>
          <FormInput 
            id="plugin-description-input"
            title="Description" 
            v-model="plugin.description"
            :aria-label="$t('Plugin description')"/>
        </FormRowGroup>
      </el-form>
    </el-card>
    
    <el-card class="settings-card">
      <template #header>
        <div class="card-header" id="remote-load-section">
          <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'cloud-download']" /></el-icon>
          <span>{{ $t('Quick Remote Load') }}</span>
        </div>
      </template>
      <p class="card-description" id="remote-load-description">
        {{ $t('Load plugin configuration from a remote manifest URL. The manifest should contain all plugin settings.') }}
      </p>
      <el-form 
        :model="plugin"
        :rules="validationRules"
        ref="remoteLoadForm"
        label-position="top"
        @submit.prevent
        aria-labelledby="remote-load-section"
        :aria-describedby="'remote-load-description'">
        <FormRowGroup role="group" :aria-label="$t('Remote plugin configuration')">
          <FormInput 
            id="manifest-url-input"
            title="Manifest URL" 
            label="required" 
            v-model="plugin.manifestUrl"
            :aria-describedby="'manifestUrl-help'"
            :aria-label="$t('Plugin manifest URL')"/>
          <FormInput 
            id="api-path-input"
            title="Plugin API Path" 
            label="Leave empty to auto-set" 
            v-model="plugin.apiPath"
            :aria-describedby="'apiPath-help'"
            :aria-label="$t('Plugin API path')"/>
        </FormRowGroup>
        <span id="manifestUrl-help" class="sr-only">{{ $t('Enter the URL to the plugin manifest JSON file') }}</span>
        <span id="apiPath-help" class="sr-only">{{ $t('If left empty, the API path will be automatically generated from the plugin name') }}</span>
      </el-form>
      <div class="refresh-button-container">
        <el-button 
          type="primary" 
          class="refresh-button"
          :loading="props.isRefreshing"
          :disabled="props.isRefreshing" 
          @click="props.lastError ? retryRefresh() : refreshPluginFromManifest()"
          @keydown.enter.prevent="props.lastError ? retryRefresh() : refreshPluginFromManifest()"
          :aria-label="$t(
            props.isRefreshing
              ? 'Loading from manifest…'
              : (props.lastError ? 'Retry loading manifest' : 'Load plugin configuration from manifest URL')
          )"
        >
          <!-- show icon only when not loading -->
          <el-icon v-if="!props.isRefreshing" aria-hidden="true">
            <font-awesome-icon :icon="['fas', 'sync']" />
          </el-icon>
          <span><!-- Span by state -->
            <template v-if="props.isRefreshing">Loading…</template>
            <template v-else-if="props.lastError">Retry</template>
            <template v-else>Refresh from Manifest</template>
          </span>
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

//added props to receive UX state
const props = defineProps<{
  plugin: Partial<IPlugin>,
  isRefreshing?: boolean,
  lastError?: string | null
}>();

const emit = defineEmits<{
  (e: 'refresh-manifest'): void
  (e: 'retry'): void
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
  emit('refresh-manifest');
}

function retryRefresh(){
  emit('retry');
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
  margin-bottom: 1rem;
  padding: 0 0rem;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  font-size: 0.875rem;
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
:deep(.el-input:focus-within),
:deep(.el-select:focus-within),
:deep(.el-textarea:focus-within) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 4px;
  border-radius: 4px;
}

:deep(.el-input__wrapper:focus-within) {
  box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
}

:deep(.el-input__wrapper:focus-within:hover) {
  box-shadow: 0 0 0 2px var(--el-color-primary-light-7);
}

/* Enhanced focus for buttons */
.refresh-button:focus-visible,
:deep(.el-button:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}


</style>
