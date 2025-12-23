<template>
  <el-form 
    @submit.native.prevent="submit" 
    @keydown.ctrl.s.prevent="submit"
    @keydown.meta.s.prevent="submit"
    class="plugin-form"
    role="form"
    :aria-label="$t(plugin?._id ? 'Edit Plugin' : 'Create Plugin')">
    <header class="page-header">
      <div class="page-title">
        <el-icon class="title-icon" aria-hidden="true"><font-awesome-icon :icon="['fas', 'puzzle-piece']" /></el-icon>
        <h1 class="page-title-text">
          <span>{{ $t(plugin?._id ? 'Edit Plugin' : 'Create Plugin') }}:</span>
          <strong v-if="edit?.name">{{ edit.name }}</strong>
        </h1>
      </div>
      <div class="header-actions">
        <el-button 
          type="primary" 
          native-type="submit" 
          :loading="props.submitting" 
          :disabled="props.submitting"
          :aria-label="$t('Save plugin changes')"
          :aria-busy="props.submitting">
          <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'save']" /></el-icon>
          <span>{{ $t('Save') }}</span>
        </el-button>
      </div>
    </header>
    <div class="main-content">
      <el-tabs 
        ref="tabsRoot"
        v-model="activeTab"
        class="editor-tabs"
        type="border-card"
        :aria-label="$t('Plugin configuration sections')">
        <el-tab-pane 
          :id="tabPanelIds['basic-info']"
          :aria-labelledby="tabLabelIds['basic-info']"
          name="basic-info" 
          lazy>
          <template #label>
            <div 
              :id="tabLabelIds['basic-info']"
              class="tab-label"
              role="tab"
              data-tab-label="basic-info"
              :aria-controls="tabPanelIds['basic-info']"
              :aria-selected="activeTab === 'basic-info'"
              :tabindex="getTabIndex('basic-info')"
              @focus="handleTabFocus('basic-info')"
              @keydown="handleTabKeydown('basic-info', $event)">
              <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'info-circle']" /></el-icon>
              <span>{{ $t('Basic Information') }}</span>
            </div>
          </template>
          <BasicInfoTab :plugin="edit" @refresh-manifest="refreshPluginFromManifest" />
        </el-tab-pane>
        
        <el-tab-pane 
          :id="tabPanelIds.apis"
          :aria-labelledby="tabLabelIds.apis"
          name="apis" 
          lazy>
          <template #label>
            <div 
              :id="tabLabelIds.apis"
              class="tab-label"
              role="tab"
              data-tab-label="apis"
              :aria-controls="tabPanelIds.apis"
              :aria-selected="activeTab === 'apis'"
              :tabindex="getTabIndex('apis')"
              @focus="handleTabFocus('apis')"
              @keydown="handleTabKeydown('apis', $event)">
              <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
              <span>{{ $t('APIs') }}</span>
            </div>
          </template>
          <APIsTab :plugin="edit" />
        </el-tab-pane>
        
        <el-tab-pane 
          :id="tabPanelIds.hooks"
          :aria-labelledby="tabLabelIds.hooks"
          name="hooks" 
          lazy>
          <template #label>
            <div 
              :id="tabLabelIds.hooks"
              class="tab-label"
              role="tab"
              data-tab-label="hooks"
              :aria-controls="tabPanelIds.hooks"
              :aria-selected="activeTab === 'hooks'"
              :tabindex="getTabIndex('hooks')"
              @focus="handleTabFocus('hooks')"
              @keydown="handleTabKeydown('hooks', $event)">
              <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'bell']" /></el-icon>
              <span>{{ $t('Hooks & Events') }}</span>
            </div>
          </template>
          <HooksEventsTab :plugin="edit" />
        </el-tab-pane>
        
        <el-tab-pane 
          :id="tabPanelIds.cruds"
          :aria-labelledby="tabLabelIds.cruds"
          name="cruds" 
          lazy>
          <template #label>
            <div 
              :id="tabLabelIds.cruds"
              class="tab-label"
              role="tab"
              data-tab-label="cruds"
              :aria-controls="tabPanelIds.cruds"
              :aria-selected="activeTab === 'cruds'"
              :tabindex="getTabIndex('cruds')"
              @focus="handleTabFocus('cruds')"
              @keydown="handleTabKeydown('cruds', $event)">
              <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'database']" /></el-icon>
              <span>{{ $t('CRUDs') }}</span>
            </div>
          </template>
          <CRUDsTab :plugin="edit" />
        </el-tab-pane>
        
        <el-tab-pane 
          :id="tabPanelIds.injectables"
          :aria-labelledby="tabLabelIds.injectables"
          name="injectables" 
          lazy>
          <template #label>
            <div 
              :id="tabLabelIds.injectables"
              class="tab-label"
              role="tab"
              data-tab-label="injectables"
              :aria-controls="tabPanelIds.injectables"
              :aria-selected="activeTab === 'injectables'"
              :tabindex="getTabIndex('injectables')"
              @focus="handleTabFocus('injectables')"
              @keydown="handleTabKeydown('injectables', $event)">
              <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'puzzle-piece']" /></el-icon>
              <span>{{ $t('Injectables') }}</span>
            </div>
          </template>
          <InjectablesTab :plugin="edit" />
        </el-tab-pane>
        
        <el-tab-pane 
          :id="tabPanelIds.microfrontends"
          :aria-labelledby="tabLabelIds.microfrontends"
          name="microfrontends" 
          lazy>
          <template #label>
            <div 
              :id="tabLabelIds.microfrontends"
              class="tab-label"
              role="tab"
              data-tab-label="microfrontends"
              :aria-controls="tabPanelIds.microfrontends"
              :aria-selected="activeTab === 'microfrontends'"
              :tabindex="getTabIndex('microfrontends')"
              @focus="handleTabFocus('microfrontends')"
              @keydown="handleTabKeydown('microfrontends', $event)">
              <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'window-restore']" /></el-icon>
              <span>{{ $t('Micro-Frontends') }}</span>
            </div>
          </template>
          <MicroFrontendsTab :plugin="edit" />
        </el-tab-pane>
        
        <el-tab-pane 
          :id="tabPanelIds.summary"
          :aria-labelledby="tabLabelIds.summary"
          name="summary" 
          lazy>
          <template #label>
            <div 
              :id="tabLabelIds.summary"
              class="tab-label"
              role="tab"
              data-tab-label="summary"
              :aria-controls="tabPanelIds.summary"
              :aria-selected="activeTab === 'summary'"
              :tabindex="getTabIndex('summary')"
              @focus="handleTabFocus('summary')"
              @keydown="handleTabKeydown('summary', $event)">
              <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'file-alt']" /></el-icon>
              <span>{{ $t('Summary') }}</span>
            </div>
          </template>
          <SummaryTab :plugin="edit" />
        </el-tab-pane>
      </el-tabs>
      
      <div class="footer-actions" role="group" :aria-label="$t('Form actions')">
        <el-button 
          type="primary" 
          native-type="submit"
          @click="submit" 
          :loading="props.submitting" 
          :disabled="props.submitting"
          :aria-label="$t('Save plugin changes')"
          :aria-busy="props.submitting">
          {{ $t('Save Changes') }}
        </el-button>
      </div>
    </div>
  </el-form>
</template>
<script setup lang="ts">
import { computed, provide, reactive, nextTick, ref, watch, type ComponentPublicInstance } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { IPlugin } from '@/services/types/plugin';

import BasicInfoTab from './plugin-form/BasicInfoTab.vue';
import APIsTab from './plugin-form/APIsTab.vue';
import HooksEventsTab from './plugin-form/HooksEventsTab.vue';
import CRUDsTab from './plugin-form/CRUDsTab.vue';
import InjectablesTab from './plugin-form/InjectablesTab.vue';
import MicroFrontendsTab from './plugin-form/MicroFrontendsTab.vue';
import SummaryTab from './plugin-form/SummaryTab.vue';

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

type TabName = 'basic-info' | 'apis' | 'hooks' | 'cruds' | 'injectables' | 'microfrontends' | 'summary';

// Ordered list of tabs to support roving tabindex keyboard navigation
const tabOrder: TabName[] = ['basic-info', 'apis', 'hooks', 'cruds', 'injectables', 'microfrontends', 'summary'];

const isTabName = (value: string | undefined | null): value is TabName => {
  return !!value && (tabOrder as string[]).includes(value);
};

const activeTab = computed({
  get: () => (isTabName(route.query.tab?.toString()) ? route.query.tab!.toString() as TabName : 'basic-info'),
  set: (tabName: string) => {
    if (!isTabName(tabName)) return;
    router.replace({ query: { ...route.query, tab: tabName } }).catch(error => {
      console.error('Failed to update route:', error);
    });
  }
});

const initialFocusedIndex = tabOrder.indexOf(activeTab.value);
const focusedTabIndex = ref(initialFocusedIndex === -1 ? 0 : initialFocusedIndex);
const tabsRoot = ref<ComponentPublicInstance | null>(null);

// Map of tab label ids so tabs are properly linked by aria attributes
const tabLabelIds: Record<TabName, string> = {
  'basic-info': 'tab-label-basic-info',
  'apis': 'tab-label-apis',
  'hooks': 'tab-label-hooks',
  'cruds': 'tab-label-cruds',
  'injectables': 'tab-label-injectables',
  'microfrontends': 'tab-label-microfrontends',
  'summary': 'tab-label-summary'
};

// Matching panel ids to connect each tab with its content region
const tabPanelIds: Record<TabName, string> = {
  'basic-info': 'plugin-panel-basic-info',
  'apis': 'plugin-panel-apis',
  'hooks': 'plugin-panel-hooks',
  'cruds': 'plugin-panel-cruds',
  'injectables': 'plugin-panel-injectables',
  'microfrontends': 'plugin-panel-microfrontends',
  'summary': 'plugin-panel-summary'
};

// Query selector to find the first logical field inside each tab panel
const focusableSelector = 'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])';

watch(() => activeTab.value, tabName => {
  const resolvedTab = isTabName(tabName) ? tabName : 'basic-info';
  const nextIndex = tabOrder.indexOf(resolvedTab);
  focusedTabIndex.value = nextIndex === -1 ? 0 : nextIndex;
});

function getTabIndex(tabName: TabName) {
  const currentIndex = focusedTabIndex.value >= 0 ? focusedTabIndex.value : 0;
  return tabOrder[currentIndex] === tabName ? 0 : -1;
}

function handleTabFocus(tabName: TabName) {
  const index = tabOrder.indexOf(tabName);
  if (index !== -1) {
    focusedTabIndex.value = index;
  }
}

function focusTabLabel(tabName: TabName) {
  nextTick(() => {
    const root = tabsRoot.value?.$el as HTMLElement | undefined;
    if (!root) return;
    const label = root.querySelector<HTMLElement>(`[data-tab-label="${tabName}"]`);
    label?.focus();
  });
}

function focusTabPanel(tabName: TabName) {
  focusFirstInput(tabName);
}

function moveFocus(offset: number) {
  const tabCount = tabOrder.length;
  const baseIndex = focusedTabIndex.value >= 0 ? focusedTabIndex.value : 0;
  const nextIndex = (baseIndex + offset + tabCount) % tabCount;
  focusedTabIndex.value = nextIndex;
  focusTabLabel(tabOrder[nextIndex]);
}

function setFocusToEdge(edge: 'start' | 'end') {
  focusedTabIndex.value = edge === 'start' ? 0 : tabOrder.length - 1;
  focusTabLabel(tabOrder[focusedTabIndex.value]);
}

function activateTab(tabName: TabName) {
  activeTab.value = tabName;
  focusTabPanel(tabName);
}

function handleTabKeydown(tabName: TabName, event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault();
      moveFocus(1);
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault();
      moveFocus(-1);
      break;
    case 'Home':
      event.preventDefault();
      setFocusToEdge('start');
      break;
    case 'End':
      event.preventDefault();
      setFocusToEdge('end');
      break;
    case 'Enter':
    case 'Space':
    case 'Spacebar':
    case ' ': // Support older browsers emitting a space character
      event.preventDefault();
      activateTab(tabName);
      break;
    default:
      break;
  }
}

provide('plugin', edit);

// Focus the first input inside the requested tab panel
function focusFirstInput(tabName?: TabName) {
  const currentTab = tabName ?? (isTabName(activeTab.value) ? activeTab.value : 'basic');
  nextTick(() => {
    let panel = document.getElementById(tabPanelIds[currentTab]);
    if (!panel) {
      panel = document.getElementById(`pane-${currentTab}`);
    }
    if (!panel) return;
    const firstInput = panel.querySelector<HTMLElement>(focusableSelector);
    if (firstInput) {
      firstInput.focus();
      return;
    }
    const contentRegion = panel.querySelector<HTMLElement>('.tab-content');
    contentRegion?.focus();
  });
}

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
    if (edit.callbackUrl && !edit.callbackUrl.startsWith('http')) {
      edit.callbackUrl = new URL(edit.callbackUrl, manifest.appUrl).href;
    }
    if (edit.registerUrl && !edit.registerUrl.startsWith('http')) {
      edit.registerUrl = new URL(edit.registerUrl, manifest.appUrl).href;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-title-text {
  font-size: 1.25rem;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--el-text-color-primary);
  font-weight: 400;
}

.page-title-text strong {
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

:deep(.el-tabs__item:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
  border-radius: 4px;
}

:deep(.el-button:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
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
