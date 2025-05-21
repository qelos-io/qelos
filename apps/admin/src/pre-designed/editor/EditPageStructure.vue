<script setup lang="ts">
import { provide, ref, toRef, watch, computed } from 'vue';
import EditHeader from '@/modules/pre-designed/components/EditHeader.vue';
import Monaco from '@/modules/users/components/Monaco.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { IMicroFrontend } from '@/services/types/plugin';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import EditPageRequirements from '@/pre-designed/editor/EditPageRequirements.vue';

const emit = defineEmits(['save', 'close'])

const props = defineProps<{
  pageName: string,
  mfe: IMicroFrontend,
  submitting: boolean
}>()

provide('submitting', toRef(props, 'submitting'))

const openCodeSection = ref('html');

const htmlEditor = ref();
const isDirty = ref(false);
const showUnsavedChangesAlert = ref(false);

const editedSettings = ref<Partial<IMicroFrontend> & { roles: string[] }>({
  roles: [],
  workspaceRoles: [],
  workspaceLabels: [],
  route: undefined
})

const editedRequirements = ref<any[]>();

const tabsWithChanges = computed(() => {
  const tabs = [];
  if (isDirty.value) tabs.push('html');
  // Add more logic for other tabs if needed
  return tabs;
});

watch(() => props.mfe, (mfe) => {
  if (!props.mfe) {
    return;
  }
  editedRequirements.value = props.mfe.requirements.map(req => {
    return {
      ...req,
      _id: undefined,
    }
  })
  editedSettings.value = {
    active: mfe.active,
    roles: typeof mfe.roles === 'string' ? (mfe.roles as string).split(',') : (mfe.roles || []),
    workspaceRoles: mfe.workspaceRoles,
    workspaceLabels: mfe.workspaceLabels,
    route: mfe.route,
    searchPlaceholder: mfe.searchPlaceholder,
    searchQuery: mfe.searchQuery,
  }
  isDirty.value = false;
}, { immediate: true })

function handleHtmlChange() {
  isDirty.value = true;
}

function save() {
  emit('save', {
    settings: editedSettings.value,
    structure: props.mfe.structure,
    requirements: editedRequirements.value
  });
  isDirty.value = false;
}

function handleClose() {
  if (isDirty.value) {
    showUnsavedChangesAlert.value = true;
  } else {
    emit('close');
  }
}

function confirmClose() {
  showUnsavedChangesAlert.value = false;
  emit('close');
}

provide('editableManager', ref(false));
</script>

<template>
  <el-form @submit.prevent="save" class="form">
    <header class="page-header">
      <div class="page-title">
        <el-icon class="title-icon"><font-awesome-icon :icon="['fas', 'edit']" /></el-icon>
        <span>{{ $t('Edit Screen') }}:</span> <strong>{{ pageName }}</strong>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="save" :loading="props.submitting" :disabled="props.submitting">
          <el-icon><font-awesome-icon :icon="['fas', 'save']" /></el-icon>
          <span>{{ $t('Save') }}</span>
        </el-button>
        <el-button @click="handleClose">
          <el-icon><font-awesome-icon :icon="['fas', 'times']" /></el-icon>
          <span>{{ $t('Close') }}</span>
        </el-button>
      </div>
    </header>
    
    <el-alert
      v-if="showUnsavedChangesAlert"
      type="warning"
      :closable="false"
      class="unsaved-alert"
    >
      <div class="alert-content">
        <span>{{ $t('You have unsaved changes. Are you sure you want to leave?') }}</span>
        <div class="alert-actions">
          <el-button size="small" @click="showUnsavedChangesAlert = false">{{ $t('Cancel') }}</el-button>
          <el-button size="small" type="danger" @click="confirmClose">{{ $t('Leave anyway') }}</el-button>
        </div>
      </div>
    </el-alert>
    
    <div class="main-content" v-if="mfe">
      <el-tabs 
        class="editor-tabs" 
        v-model="openCodeSection"
        type="border-card"
      >
        <el-tab-pane name="html" :label="$t('HTML')" lazy>
          <template #label>
            <div class="tab-label">
              <el-icon><font-awesome-icon :icon="['fas', 'code']" /></el-icon>
              <span>{{ $t('HTML') }}</span>
              <el-badge v-if="tabsWithChanges.includes('html')" is-dot class="tab-badge" />
            </div>
          </template>
          <div class="tab-content">
            <div class="editor-toolbar">
              <el-tooltip content="Format code" placement="top">
                <el-button size="small" circle>
                  <el-icon><font-awesome-icon :icon="['fas', 'align-left']" /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
            <Monaco 
              ref="htmlEditor"
              v-model="mfe.structure"
              language="html"
              @update:model-value="handleHtmlChange"
              class="monaco-editor"
            />
          </div>
        </el-tab-pane>
        
        <el-tab-pane name="requirements" :label="$t('Requirements')" lazy>
          <template #label>
            <div class="tab-label">
              <el-icon><font-awesome-icon :icon="['fas', 'database']" /></el-icon>
              <span>{{ $t('Requirements') }}</span>
              <el-badge v-if="editedRequirements?.length" :value="editedRequirements.length" class="tab-badge" />
            </div>
          </template>
          <div class="tab-content">
            <EditPageRequirements v-model="editedRequirements"/>
          </div>
        </el-tab-pane>
        
        <el-tab-pane name="settings" :label="$t('Settings')" lazy>
          <template #label>
            <div class="tab-label">
              <el-icon><font-awesome-icon :icon="['fas', 'cog']" /></el-icon>
              <span>{{ $t('Settings') }}</span>
            </div>
          </template>
          <div class="tab-content settings-content">
            <el-card class="settings-card">
              <template #header>
                <div class="card-header">
                  <el-icon><font-awesome-icon :icon="['fas', 'toggle-on']" /></el-icon>
                  <span>{{ $t('General Settings') }}</span>
                </div>
              </template>
              <FormInput type="switch" v-model="editedSettings.active" :title="$t('Active?')" class="switch-input" />
            </el-card>
            
            <el-card class="settings-card">
              <template #header>
                <div class="card-header">
                  <el-icon><font-awesome-icon :icon="['fas', 'route']" /></el-icon>
                  <span>{{ $t('Routing') }}</span>
                </div>
              </template>
              <FormRowGroup>
                <FormInput title="Route Name" v-model="editedSettings.route.name" size="small" />
                <FormInput title="Route Path" v-model="editedSettings.route.path" required size="small" />
                <NavigationPositionSelector v-model="editedSettings.route.navBarPosition" />
              </FormRowGroup>
            </el-card>
            
            <el-card class="settings-card">
              <template #header>
                <div class="card-header">
                  <el-icon><font-awesome-icon :icon="['fas', 'user-shield']" /></el-icon>
                  <span>{{ $t('Access Control') }}</span>
                </div>
              </template>
              <FormRowGroup>
                <el-form-item>
                  <template #label>
                    {{ $t('Roles') }}
                    <InfoIcon content="Only specified roles will be able to access this page"/>
                  </template>
                  <el-select
                    v-model="editedSettings.roles"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    :reserve-keyword="false"
                    size="small"
                    class="w-full"
                  >
                    <template v-for="role in props.mfe.roles">
                      <el-option v-if="role !== '*'" :key="role" :label="role" :value="role"/>
                    </template>
                    <el-option label="All (*)" value="*"/>
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <template #label>
                    {{ $t('Workspace Roles') }}
                    <InfoIcon content="Only specified workspace roles will be able to access this page"/>
                  </template>
                  <el-select
                    v-model="editedSettings.workspaceRoles"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    :reserve-keyword="false"
                    size="small"
                    class="w-full"
                  >
                    <template v-for="role in props.mfe.workspaceRoles">
                      <el-option v-if="role !== '*'" :key="role" :label="role" :value="role"/>
                    </template>
                    <el-option label="All (*)" value="*"/>
                  </el-select>
                </el-form-item>
                <LabelsInput title="Workspace Labels" v-model="editedSettings.workspaceLabels" size="small" />
              </FormRowGroup>
            </el-card>
            
            <el-card class="settings-card">
              <template #header>
                <div class="card-header">
                  <el-icon><font-awesome-icon :icon="['fas', 'search']" /></el-icon>
                  <span>{{ $t('Search Options') }}</span>
                </div>
              </template>
              <div class="search-options">
                <div class="switch-container">
                  <span class="switch-label">{{ $t('Enable Search') }}</span>
                  <el-switch 
                    v-model="editedSettings.searchQuery" 
                    active-color="var(--el-color-primary)"
                    inactive-color="var(--el-border-color)"
                  />
                </div>
                
                <el-form-item :label="$t('Search Placeholder')" class="search-placeholder-input">
                  <el-input 
                    v-model="editedSettings.searchPlaceholder" 
                    size="small" 
                    :disabled="!editedSettings.searchQuery"
                    :placeholder="$t('Enter placeholder text...')"
                  />
                </el-form-item>
              </div>
            </el-card>
          </div>
        </el-tab-pane>
      </el-tabs>
      
      <div class="footer-actions">
        <el-button type="primary" @click="save" :loading="props.submitting" :disabled="props.submitting">
          {{ $t('Save Changes') }}
        </el-button>
      </div>
    </div>
  </el-form>
</template>

<style scoped>
.form {
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

.unsaved-alert {
  margin-bottom: 1rem;
}

.alert-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.alert-actions {
  display: flex;
  gap: 0.5rem;
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

.tab-badge {
  margin-left: 0.25rem;
}

.tab-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 1rem;
}

.editor-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.monaco-editor {
  min-height: calc(100vh - 250px);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.switch-input {
  margin-bottom: 0;
}

.search-options {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.switch-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
}

.switch-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.search-placeholder-input {
  margin-bottom: 0;
}

:deep(.el-switch__core) {
  width: 40px !important;
}

:deep(.el-switch.is-checked .el-switch__core) {
  background-color: var(--el-color-primary) !important;
  border-color: var(--el-color-primary) !important;
}

.w-full {
  width: 100%;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid var(--el-border-color);
  margin-top: 1rem;
  background-color: var(--el-fill-color-light);
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
</style>