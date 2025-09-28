<template>
  <el-form @submit.native.prevent="submit" class="plugin-form">
    <header class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><font-awesome-icon :icon="['fas', 'puzzle-piece']" /></el-icon>
        <span>{{ $t(plugin?._id ? 'Edit Plugin' : 'Create Plugin') }}:</span>
        <strong v-if="edit?.name">{{ edit.name }}</strong>
      </div>
      <div class="header-actions">
        <el-button type="primary" native-type="submit" :loading="props.submitting" :disabled="props.submitting">
          <el-icon><font-awesome-icon :icon="['fas', 'save']" /></el-icon>
          <span>{{ $t('Save') }}</span>
        </el-button>
      </div>
    </header>
    <div class="main-content">
      <el-tabs 
        v-model="activeTab"
        class="editor-tabs"
        type="border-card">
        <el-tab-pane name="basic" lazy>
          <template #label>
            <div class="tab-label">
              <el-icon><font-awesome-icon :icon="['fas', 'info-circle']" /></el-icon>
              <span>{{ $t('Basic Information') }}</span>
            </div>
          </template>
          <BasicInfoTab :plugin="edit" @refresh-manifest="refreshPluginFromManifest" />
        </el-tab-pane>
        
        <el-tab-pane name="apis" lazy>
          <template #label>
            <div class="tab-label">
              <el-icon><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
              <span>{{ $t('APIs') }}</span>
            </div>
          </template>
          <APIsTab :plugin="edit" />
        </el-tab-pane>
        
        <el-tab-pane name="hooks" lazy>
          <template #label>
            <div class="tab-label">
              <el-icon><font-awesome-icon :icon="['fas', 'bell']" /></el-icon>
              <span>{{ $t('Hooks & Events') }}</span>
            </div>
          </template>
          <HooksEventsTab :plugin="edit" />
        </el-tab-pane>
        
        <el-tab-pane name="cruds" lazy>
          <template #label>
            <div class="tab-label">
              <el-icon><font-awesome-icon :icon="['fas', 'database']" /></el-icon>
              <span>{{ $t('CRUDs') }}</span>
            </div>
          </template>
          <CRUDsTab :plugin="edit" />
        </el-tab-pane>
        
        <el-tab-pane name="microfrontends" lazy>
          <template #label>
            <div class="tab-label">
              <el-icon><font-awesome-icon :icon="['fas', 'window-restore']" /></el-icon>
              <span>{{ $t('Micro-Frontends') }}</span>
            </div>
          </template>
          <MicroFrontendsTab :plugin="edit" />
        </el-tab-pane>
        
        <el-tab-pane name="injectables" lazy>
          <template #label>
            <div class="tab-label">
              <el-icon><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
              <span>{{ $t('Injectables') }}</span>
            </div>
          </template>
          <InjectablesTab :plugin="edit" />
        </el-tab-pane>
        
        <el-tab-pane name="summary" lazy>
          <template #label>
            <div class="tab-label">
              <el-icon><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
              <span>{{ $t('Summary') }}</span>
            </div>
          </template>
          <SummaryTab :plugin="edit" @update-json="updatePluginJson" />
        </el-tab-pane>
      </el-tabs>
      
      <div class="footer-actions">
        <el-button type="primary" @click="submit" :loading="props.submitting" :disabled="props.submitting">
          {{ $t('Save Changes') }}
        </el-button>
      </div>
    </div>
  </el-form>
</template>
<script setup lang="ts">
import { computed, provide, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IPlugin } from '@/services/types/plugin';
import {
  BasicInfoTab,
  APIsTab,
  HooksEventsTab,
  CRUDsTab,
  MicroFrontendsTab,
  InjectablesTab,
  SummaryTab
} from '@/modules/plugins/components/plugin-form';

const props = defineProps<{
  plugin?: Partial<IPlugin>;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submitted', plugin: Partial<IPlugin>): void;
}>();

const route = useRoute();
const router = useRouter();

const edit = reactive<Partial<IPlugin>>({
  name: '',
  subscribedEvents: [],
  injectables: [],
  ...props.plugin as Partial<IPlugin>
});

const activeTab = computed({
  get: () => route.query.tab?.toString() || 'basic',
  set: (tabName: string) => {
    router.replace({ query: { ...route.query, tab: tabName } }).catch(error => {
      console.error('Failed to update route:', error);
    });
  }
});

provide('plugin', edit);

// Refresh plugin from manifest
async function refreshPluginFromManifest() {
  if (!edit.manifestUrl) return;
  
  try {
    const response = await fetch(edit.manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status}`);
    }
    
    const manifest = await response.json();
    Object.assign(edit, manifest);

    if (!edit.manifestUrl.startsWith('http')) {
      edit.manifestUrl = new URL(edit.manifestUrl, manifest.appUrl).href;
    }
    
    if (!edit.apiPath && manifest.name) {
      edit.apiPath = manifest.name.toLowerCase().replace(/\s+/g, '-');
    }
    submit();
  } catch (error) {
    console.error('Error fetching manifest:', error);
  }
}

// Update plugin JSON from the Summary tab
function updatePluginJson(value: string) {
  try {
    const updatedPlugin = JSON.parse(value);
    Object.assign(edit, updatedPlugin);
  } catch (error) {
    console.error('Failed to parse JSON:', error);
  }
}

// Submit the form
function submit() {
  if (!edit) return;
  // @ts-ignore
  delete edit.__v; // Remove the __v property before submitting
  emit('submitted', edit);
}
</script>
<style scoped>
.plugin-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--el-border-color);
  padding: 1rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px 4px 0 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.page-title {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--el-text-color-primary);
}

.page-title strong {
  color: var(--el-color-primary);
  font-weight: 600;
}

.title-icon {
  font-size: 1.25rem;
  color: var(--el-color-primary);
  margin-right: 0.25rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.main-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 120px);
}

.editor-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

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

.settings-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

.event-item, .injectable-item {
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  transition: all 0.3s;
}

.event-item:hover, .injectable-item:hover {
  background-color: var(--el-fill-color);
}

.event-item:not(:last-child):after, .injectable-item:not(:last-child):after {
  content: '  ';
  display: block;
  width: 50%;
  border-block-end: 1px solid var(--el-border-color);
  margin-inline: auto;
  margin-block-end: 10px;
}

.add-more-button {
  margin-top: 0.5rem;
}

.monaco-container {
  height: 400px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 1rem;
}

.monaco-editor {
  height: 100%;
}

.refresh-button-container {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.coming-soon-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  color: var(--el-text-color-secondary);
}

.coming-soon-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--el-color-info);
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid var(--el-border-color);
  margin-top: 1rem;
  background-color: var(--el-fill-color-light);
}

.remove-row {
  margin-bottom: 5px;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
}

:deep(.el-tabs__nav) {
  background-color: var(--el-fill-color-light);
}

:deep(.el-tabs__item.is-active) {
  font-weight: 600;
}

:deep(.el-card__body) {
  padding: 1rem;
}

h3 {
  margin-block: 10px;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

p {
  color: var(--el-text-color-secondary);
  margin-bottom: 1rem;
  line-height: 1.5;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .tab-content {
    padding: 0.5rem;
  }
}
</style>
