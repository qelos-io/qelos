<template>
  <div class="mfe-manager">
    <!-- Main Content -->
    <div class="mfe-content" :class="{ 'with-panel': showSidePanel }">
      <!-- MFE List -->
      <div class="mfe-list">
        <div v-if="!edit.microFrontends?.length" class="empty-state">
          <el-icon class="empty-icon"><font-awesome-icon :icon="['fas', 'window-restore']" /></el-icon>
          <h4>No Micro Frontends</h4>
          <p>Start by adding your first micro frontend</p>
          <el-button type="primary" @click="addNewMicroFrontend">
            <el-icon><font-awesome-icon :icon="['fas', 'plus']" /></el-icon>
            Add First MFE
          </el-button>
        </div>

        <!-- Desktop Table View -->
        <div v-else class="mfe-table desktop-table">
          <div class="table-header">
            <div class="col-status">Status</div>
            <div class="col-name">Name</div>
            <div class="col-type">Type</div>
            <div class="col-implementation">Implementation</div>
            <div class="col-route">Route/Target</div>
            <div class="col-permissions">Permissions</div>
            <div class="col-actions">Actions</div>
          </div>
          <div 
            v-for="(mfe, index) in edit.microFrontends" 
            :key="index"
            class="table-row"
            :class="{ 
              'selected': selectedMfe === index,
              'inactive': !mfe.active 
            }"
            @click="editMfe(index)"
          >
            <div class="col-status">
              <el-switch 
                v-model="mfe.active" 
                size="small"
                @click.stop
              />
            </div>
            
            <div class="col-name">
              <div class="mfe-name">{{ mfe.name || 'Unnamed MFE' }}</div>
              <div class="mfe-description">{{ mfe.description || 'No description' }}</div>
            </div>
            
            <div class="col-type">
              <el-tag size="small" :type="getMfeTypeDisplay(mfe) === 'Page' ? 'primary' : getMfeTypeDisplay(mfe) === 'Component' ? 'success' : 'warning'">
                {{ getMfeTypeDisplay(mfe) }}
              </el-tag>
            </div>
            
            <div class="col-implementation">
              <el-tag size="small" :type="getMfeImplementation(mfe) === 'No-Code' ? 'info' : ''">
                {{ getMfeImplementation(mfe) }}
              </el-tag>
            </div>
            
            <div class="col-route">
              <span v-if="mfe.route">{{ mfe.route.path || mfe.route.name || 'Not set' }}</span>
              <span v-else-if="mfe.component">{{ mfe.component.page || 'Not set' }}</span>
              <span v-else-if="mfe.modal">{{ mfe.modal.name || 'Not set' }}</span>
              <span v-else>-</span>
            </div>
            
            <div class="col-permissions">
              <el-tag v-if="mfe.guest" size="small" type="warning">Guest</el-tag>
              <el-tag v-else size="small">{{ mfe.roles?.includes('*') ? 'All Users' : 'Restricted' }}</el-tag>
            </div>
            
            <div class="col-actions">
              <el-button 
                text 
                type="primary" 
                @click.stop="editMfe(index)"
                size="small"
              >
                <font-awesome-icon :icon="['fas', 'edit']" />
              </el-button>
              <el-button 
                text 
                type="danger" 
                @click.stop="removeMicroFrontend(index)"
                size="small"
              >
                <font-awesome-icon :icon="['fas', 'trash']" />
              </el-button>
            </div>
          </div>
        </div>

        <!-- Mobile Card View -->
        <div v-if="edit.microFrontends?.length" class="mobile-cards">
          <div 
            v-for="(mfe, index) in edit.microFrontends" 
            :key="index"
            class="mobile-card"
            :class="{ 
              'selected': selectedMfe === index,
              'inactive': !mfe.active 
            }"
            @click="editMfe(index)"
          >
            <div class="card-header">
              <div class="card-title">
                <h4>{{ mfe.name || 'Unnamed MFE' }}</h4>
                <div class="card-badges">
                  <el-tag size="small" :type="getMfeTypeDisplay(mfe) === 'Page' ? 'primary' : getMfeTypeDisplay(mfe) === 'Component' ? 'success' : 'warning'">
                    {{ getMfeTypeDisplay(mfe) }}
                  </el-tag>
                  <el-tag size="small" :type="getMfeImplementation(mfe) === 'No-Code' ? 'info' : ''">
                    {{ getMfeImplementation(mfe) }}
                  </el-tag>
                </div>
              </div>
              <div class="card-actions">
                <el-switch 
                  v-model="mfe.active" 
                  size="small"
                  @click.stop
                />
                <el-button 
                  text 
                  type="danger" 
                  @click.stop="removeMicroFrontend(index)"
                  size="small"
                >
                  <font-awesome-icon :icon="['fas', 'trash']" />
                </el-button>
              </div>
            </div>
            
            <div class="card-content">
              <p v-if="mfe.description" class="card-description">{{ mfe.description }}</p>
              <div class="card-info">
                <div class="info-item">
                  <span class="info-label">Route/Target:</span>
                  <span class="info-value">
                    <span v-if="mfe.route">{{ mfe.route.path || mfe.route.name || 'Not set' }}</span>
                    <span v-else-if="mfe.component">{{ mfe.component.page || 'Not set' }}</span>
                    <span v-else-if="mfe.modal">{{ mfe.modal.name || 'Not set' }}</span>
                    <span v-else>-</span>
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Permissions:</span>
                  <el-tag v-if="mfe.guest" size="small" type="warning">Guest</el-tag>
                  <el-tag v-else size="small">{{ mfe.roles?.includes('*') ? 'All Users' : 'Restricted' }}</el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Side Panel -->
      <div v-if="showSidePanel && currentMfe" class="side-panel" :class="{ 'mobile-panel': true }">
        <div class="panel-header">
          <div class="header-content">
            <div class="header-icon">
              <font-awesome-icon :icon="['fas', 'cog']" />
            </div>
            <div class="header-text">
              <h4>Configure Micro Frontend</h4>
              <p class="header-subtitle">{{ currentMfe.name || 'Unnamed MFE' }}</p>
            </div>
          </div>
          <el-button text @click="closeSidePanel" class="close-button">
            <font-awesome-icon :icon="['fas', 'times']" />
          </el-button>
        </div>
        
        <div class="panel-content">
          <!-- Basic Info Card -->
          <div class="form-card">
            <div class="card-header">
              <div class="card-icon">
                <font-awesome-icon :icon="['fas', 'info-circle']" />
              </div>
              <h5>Basic Information</h5>
            </div>
            <div class="card-content">
              <div class="form-grid">
                <FormInput title="Name" v-model="currentMfe.name" class="form-field full-width" />
                <FormInput title="Description" v-model="currentMfe.description" class="form-field full-width" />
                <div class="switch-field">
                  <div class="switch-label">
                    <font-awesome-icon :icon="['fas', 'power-off']" class="switch-icon" />
                    <span>Active Status</span>
                  </div>
                  <el-switch v-model="currentMfe.active" size="large" />
                </div>
              </div>
            </div>
          </div>

          <!-- Type Selection Card -->
          <div class="form-card">
            <div class="card-header">
              <div class="card-icon">
                <font-awesome-icon :icon="['fas', 'shapes']" />
              </div>
              <h5>Frontend Type</h5>
            </div>
            <div class="card-content">
              <div class="type-selector">
                <div 
                  v-for="type in mfeTypes" 
                  :key="type.value"
                  class="type-option"
                  :class="{ 'active': getCurrentMfeType(currentMfe) === type.value }"
                  @click="toggleMfeType(currentMfe, type.value)"
                >
                  <div class="type-icon">
                    <font-awesome-icon :icon="type.icon" />
                  </div>
                  <div class="type-content">
                    <h6>{{ type.label }}</h6>
                    <p>{{ getTypeDescription(type.value) }}</p>
                  </div>
                  <div class="type-check" v-if="getCurrentMfeType(currentMfe) === type.value">
                    <font-awesome-icon :icon="['fas', 'check-circle']" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Implementation Card -->
          <div class="form-card">
            <div class="card-header">
              <div class="card-icon">
                <font-awesome-icon :icon="['fas', 'code']" />
              </div>
              <h5>Implementation</h5>
            </div>
            <div class="card-content">
              <div class="template-selector">
                <label class="template-label">Base Template</label>
                <el-select 
                  v-model="currentMfe.use" 
                  placeholder="Choose a template..." 
                  clearable
                  size="large"
                  class="template-select"
                  @change="onTemplateChange"
                >
                  <el-option value="plain" label="Plain Template">
                    <div class="option-content">
                      <font-awesome-icon :icon="['fas', 'file-alt']" />
                      <span>Plain Template</span>
                    </div>
                  </el-option>
                  <el-option value="basic-form" label="Basic Form">
                    <div class="option-content">
                      <font-awesome-icon :icon="['fas', 'wpforms']" />
                      <span>Basic Form</span>
                    </div>
                  </el-option>
                  <el-option value="rows-list" label="Rows List">
                    <div class="option-content">
                      <font-awesome-icon :icon="['fas', 'list']" />
                      <span>Rows List</span>
                    </div>
                  </el-option>
                </el-select>
                
                <div style="margin: 1rem 0; text-align: center; color: var(--el-text-color-secondary); font-size: 0.875rem;">
                  — OR —
                </div>
                
                <label class="template-label">Custom URL (iFrame)</label>
                <FormInput 
                  title="URL" 
                  v-model="currentMfe.url" 
                  placeholder="https://your-app.com"
                  @input="onUrlChange"
                />
              </div>
            </div>
          </div>

          <!-- Type-specific Configuration Cards -->
          <div class="form-card" v-if="currentMfe.route">
            <div class="card-header">
              <div class="card-icon">
                <font-awesome-icon :icon="['fas', 'route']" />
              </div>
              <h5>Page Configuration</h5>
            </div>
            <div class="card-content">
              <div class="form-grid">
                <FormInput title="Route Name" v-model="currentMfe.route.name" class="form-field" />
                <FormInput title="Route Path" v-model="currentMfe.route.path" class="form-field" />
                <div class="form-field full-width">
                  <NavigationPositionSelector title="Navigation Position" v-model="currentMfe.route.navBarPosition" />
                </div>
                <div class="form-field full-width">
                  <LabelsInput title="Route Roles" v-model="currentMfe.route.roles" />
                </div>
              </div>
            </div>
          </div>

          <div class="form-card" v-if="currentMfe.component?.page">
            <div class="card-header">
              <div class="card-icon">
                <font-awesome-icon :icon="['fas', 'puzzle-piece']" />
              </div>
              <h5>Component Configuration</h5>
            </div>
            <div class="card-content">
              <div class="form-grid">
                <FormInput title="Page" v-model="currentMfe.component.page" class="form-field" />
                <div class="form-field">
                  <label class="field-label">Position</label>
                  <el-select v-model="currentMfe.component.position" size="large">
                    <el-option value="top" label="Top" />
                    <el-option value="left" label="Left" />
                    <el-option value="right" label="Right" />
                    <el-option value="bottom" label="Bottom" />
                  </el-select>
                </div>
              </div>
            </div>
          </div>

          <div class="form-card" v-if="currentMfe.modal?.name">
            <div class="card-header">
              <div class="card-icon">
                <font-awesome-icon :icon="['fas', 'window-restore']" />
              </div>
              <h5>Modal Configuration</h5>
            </div>
            <div class="card-content">
              <div class="form-grid">
                <FormInput title="Modal Name" v-model="currentMfe.modal.name" class="form-field" />
                <div class="form-field">
                  <label class="field-label">Size</label>
                  <el-select v-model="currentMfe.modal.size" size="large">
                    <el-option value="sm" label="Small" />
                    <el-option value="md" label="Medium" />
                    <el-option value="lg" label="Large" />
                    <el-option value="full" label="Full Screen" />
                  </el-select>
                </div>
              </div>
            </div>
          </div>

          <!-- Permissions Card -->
          <div class="form-card permissions-card">
            <div class="card-header">
              <div class="card-icon">
                <font-awesome-icon :icon="['fas', 'shield-alt']" />
              </div>
              <h5>Access Control</h5>
            </div>
            <div class="card-content">
              <div class="permission-toggle">
                <div class="toggle-content">
                  <div class="toggle-icon">
                    <font-awesome-icon :icon="['fas', 'user-friends']" />
                  </div>
                  <div class="toggle-text">
                    <h6>Guest Access</h6>
                    <p>Allow unauthenticated users to access this micro frontend</p>
                  </div>
                </div>
                <el-switch v-model="currentMfe.guest" size="large" />
              </div>
              
              <div v-if="!currentMfe.guest" class="permissions-grid">
                <div class="permission-section">
                  <div class="permission-header">
                    <font-awesome-icon :icon="['fas', 'users']" />
                    <span>User Roles</span>
                  </div>
                  <LabelsInput title="User Roles" v-model="currentMfe.roles" placeholder="Add user roles..." />
                </div>
                <div class="permission-section">
                  <div class="permission-header">
                    <font-awesome-icon :icon="['fas', 'briefcase']" />
                    <span>Workspace Roles</span>
                  </div>
                  <LabelsInput title="Workspace Roles" v-model="currentMfe.workspaceRoles" placeholder="Add workspace roles..." />
                </div>
                <div class="permission-section">
                  <div class="permission-header">
                    <font-awesome-icon :icon="['fas', 'tags']" />
                    <span>Workspace Labels</span>
                  </div>
                  <LabelsInput title="Workspace Labels" v-model="currentMfe.workspaceLabels" placeholder="Add workspace labels..." />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Panel Overlay -->
    <div v-if="showSidePanel" class="mobile-overlay" @click="closeSidePanel"></div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, computed } from 'vue';
import { IPlugin } from '@/services/types/plugin';
import { UnwrapNestedRefs } from '@vue/reactivity';
import { MfeBaseTemplate } from '@/modules/plugins/types';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import PreDesignedScreensSelector from '@/modules/plugins/components/PreDesignedScreensSelector.vue';
import NavigationPositionSelector from '@/modules/plugins/components/NavigationPositionSelector.vue';

const edit = inject<UnwrapNestedRefs<Partial<IPlugin>>>('edit');

const selectedMfe = ref<number | null>(null);
const showSidePanel = ref(false);

const mfeTypes = [
  { value: 'page', label: 'Page', icon: ['fas', 'window-maximize'] },
  { value: 'component', label: 'Component', icon: ['fas', 'puzzle-piece'] },
  { value: 'modal', label: 'Modal', icon: ['fas', 'window-restore'] }
];

function addNewMicroFrontend() {
  if (!edit.microFrontends) edit.microFrontends = [];
  
  const newMfe = {
    name: `MFE ${edit.microFrontends.length + 1}`,
    description: '',
    manifestUrl: '',
    active: true,
    opened: true,
    url: '',
    roles: ['*'],
    workspaceRoles: ['*'],
    workspaceLabels: ['*'],
    guest: false,
    route: {
      name: '',
      path: '',
      roles: ['*'],
      navBarPosition: false as const
    }
  };
  
  edit.microFrontends.push(newMfe);
  selectedMfe.value = edit.microFrontends.length - 1;
  showSidePanel.value = true;
}

function removeMicroFrontend(index: number) {
  edit.microFrontends.splice(index, 1);
  if (selectedMfe.value === index) {
    selectedMfe.value = null;
    showSidePanel.value = false;
  } else if (selectedMfe.value !== null && selectedMfe.value > index) {
    selectedMfe.value--;
  }
}

function editMfe(index: number) {
  selectedMfe.value = index;
  showSidePanel.value = true;
}

function closeSidePanel() {
  showSidePanel.value = false;
  selectedMfe.value = null;
}

function getMfeTypeDisplay(mfe: any) {
  if (mfe.route) return 'Page';
  if (mfe.component) return 'Component';
  if (mfe.modal) return 'Modal';
  return 'Page';
}

function getMfeImplementation(mfe: any) {
  if (mfe.use) return 'No-Code';
  return 'iFrame';
}

function toggleMfeType(mfe: any, type: string) {  
  const currentType = getCurrentMfeType(mfe);
  if (currentType === type) return;
  // Set the appropriate type
  switch (type) {
    case 'page':
      mfe.route = { name: mfe.name.replaceAll(' ', '-'), path: '', roles: ['*'], navBarPosition: false };
      mfe.component = {};
      mfe.modal = {};
      break;
    case 'component':
      mfe.component = { page: 'admin-dashboard', position: 'top' };
      mfe.route = {};
      mfe.modal = {};
      break;
    case 'modal':
      mfe.modal = { name: mfe.name.replaceAll(' ', '-'), params: [], size: 'md' };
      mfe.route = {};
      mfe.component = {};
      break;
  }
}

function getCurrentMfeType(mfe: any) {
  if (mfe.route?.path) return 'page';
  if (mfe.component?.page) return 'component';
  if (mfe.modal?.name) return 'modal';
  return 'page';
}

function getTypeDescription(type: string) {
  switch (type) {
    case 'page':
      return 'A full-page micro frontend';
    case 'component':
      return 'A reusable component micro frontend';
    case 'modal':
      return 'A modal window micro frontend';
    default:
      return '';
  }
}

const currentMfe = computed(() => {
  if (selectedMfe.value !== null && edit.microFrontends) {
    return edit.microFrontends[selectedMfe.value];
  }
  return null;
});

function onTemplateChange() {
  currentMfe.value.url = '';
}

function onUrlChange() {
  currentMfe.value.use = '';
}

// Expose functions to parent component
defineExpose({
  addNewMicroFrontend
});
</script>

<style scoped>
.mfe-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mfe-content {
  flex: 1;
  display: flex;
  gap: 1rem;
  min-height: 0;
  position: relative;
}

.mfe-content.with-panel .mfe-list {
  flex: 1;
}

.mfe-list {
  flex: 1;
  min-width: 0;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--el-text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  color: var(--el-color-primary-light-3);
  margin-bottom: 1rem;
}

.empty-state h4 {
  margin: 0 0 0.5rem 0;
  color: var(--el-text-color-primary);
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
}

/* Desktop Table */
.desktop-table {
  display: block;
}

.mfe-table {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 80px 1fr 100px 120px 150px 120px 100px;
  gap: 1rem;
  padding: 1rem;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-light);
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--el-text-color-primary);
}

.table-row {
  display: grid;
  grid-template-columns: 80px 1fr 100px 120px 150px 120px 100px;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  transition: all 0.2s ease;
}

.table-row:hover {
  background: var(--el-bg-color-page);
}

.table-row.selected {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.table-row.inactive {
  opacity: 0.6;
}

.table-row:last-child {
  border-bottom: none;
}

.col-status {
  display: flex;
  align-items: center;
}

.col-name {
  min-width: 0;
}

.mfe-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 0.25rem;
}

.mfe-description {
  font-size: 0.75rem;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-type, .col-implementation, .col-permissions {
  display: flex;
  align-items: center;
}

.col-route {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: var(--el-text-color-secondary);
}

.col-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Mobile Cards */
.mobile-cards {
  display: none;
  flex-direction: column;
  gap: 1rem;
}

.mobile-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 1rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mobile-card:hover {
  background: var(--el-bg-color-page);
}

.mobile-card.selected {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
}

.mobile-card.inactive {
  opacity: 0.6;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.card-title h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.card-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.card-content {
  font-size: 0.875rem;
}

.card-description {
  margin: 0 0 0.75rem 0;
  color: var(--el-text-color-secondary);
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.info-label {
  font-weight: 500;
  color: var(--el-text-color-primary);
  flex-shrink: 0;
}

.info-value {
  color: var(--el-text-color-secondary);
  text-align: right;
}

/* Side Panel */
.side-panel {
  width: 500px;
  min-width: 38%;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  background: white;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  max-height: 600px;
  min-height: 400px;
  flex-shrink: 0;
  position: sticky;
  top: 20px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1rem 1rem 1rem;
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--el-color-primary-light-9) 0%, white 100%);
  border-radius: 8px 8px 0 0;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--el-color-primary-light-8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--el-color-primary);
}

.header-text h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--el-text-color-secondary);
  font-weight: 400;
}

.close-button {
  padding: 0.5rem;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.panel-content {
  flex: 1;
  padding: 1.5rem 1rem;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.form-card {
  margin-bottom: 1.5rem;
  border: 1px solid var(--el-border-color-light);
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  overflow: hidden;
}

.form-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-color: var(--el-color-primary-light-7);
}

.form-card:last-child {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.card-header h5 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.card-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: var(--el-color-primary);
}

.card-content {
  padding: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field.full-width {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 0.25rem;
}

.switch-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  grid-column: 1 / -1;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.switch-icon {
  font-size: 1rem;
  color: var(--el-color-primary);
}

.type-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.type-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid var(--el-border-color-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.type-option:hover {
  background: var(--el-bg-color-page);
  border-color: var(--el-color-primary-light-7);
}

.type-option.active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 3px var(--el-color-primary-light-9);
}

.type-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--el-color-primary-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--el-color-primary);
  flex-shrink: 0;
}

.type-option.active .type-icon {
  background: var(--el-color-primary);
  color: white;
}

.type-content {
  flex: 1;
}

.type-content h6 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.type-content p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.type-check {
  font-size: 1.5rem;
  color: var(--el-color-primary);
}

.template-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.template-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.template-select {
  width: 100%;
}

.option-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.permissions-card .card-header {
  background: linear-gradient(135deg, var(--el-color-warning-light-9) 0%, var(--el-bg-color-page) 100%);
}

.permissions-card .card-icon {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning-dark-2);
}

.permission-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.toggle-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toggle-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: var(--el-color-warning-light-9);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  color: var(--el-color-warning-dark-2);
}

.toggle-text h6 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.toggle-text p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.permissions-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.permission-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.permission-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.permission-header svg {
  font-size: 1rem;
  color: var(--el-color-primary);
}

.mobile-overlay {
  display: none;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .table-header,
  .table-row {
    grid-template-columns: 60px 1fr 80px 100px 120px 100px 80px;
    gap: 0.75rem;
    padding: 0.75rem;
  }
  
  .side-panel {
    width: 350px;
  }
}

@media (max-width: 992px) {
  .mfe-content.with-panel {
    flex-direction: column;
    gap: 1rem;
  }
  
  .side-panel {
    width: 100%;
    height: 400px;
    max-height: 50vh;
    min-height: 300px;
    position: relative;
    top: 0;
  }
  
  .table-header,
  .table-row {
    grid-template-columns: 60px 1fr 80px 100px 80px;
    gap: 0.5rem;
  }
  
  .col-implementation,
  .col-route {
    display: none;
  }
}

@media (max-width: 768px) {
  .mfe-header {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  
  .header-description {
    display: none;
  }
  
  .add-button {
    width: 100%;
  }
  
  .add-button .button-text {
    display: inline;
  }
  
  .desktop-table {
    display: none;
  }
  
  .mobile-cards {
    display: flex;
  }
  
  .mfe-content.with-panel {
    position: relative;
  }
  
  .side-panel.mobile-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    max-width: 400px;
    height: 100vh;
    max-height: 100vh;
    z-index: 1000;
    border-radius: 0;
    border-right: none;
    transform: translateX(0);
    animation: slideInRight 0.3s ease-out;
  }
  
  .mobile-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
  }
  
  .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .card-title {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .card-actions {
    align-self: flex-end;
  }
  
  .info-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
  }
  
  .info-value {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .mfe-header {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
  }
  
  .header-info h3 {
    font-size: 1.125rem;
  }
  
  .mobile-card {
    padding: 0.75rem;
  }
  
  .card-title h4 {
    font-size: 0.875rem;
  }
  
  .side-panel.mobile-panel {
    max-width: 100%;
  }
  
  .panel-content {
    padding: 0.75rem;
  }
  
  .config-section {
    margin-bottom: 1rem;
  }
  
  .type-buttons {
    flex-direction: column;
  }
  
  .type-buttons .el-button {
    justify-content: flex-start;
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

/* Touch optimizations */
@media (hover: none) and (pointer: coarse) {
  .table-row,
  .mobile-card {
    min-height: 44px;
  }
  
  .col-actions .el-button,
  .card-actions .el-button {
    min-width: 44px;
    min-height: 44px;
  }
  
  .close-button {
    min-width: 44px;
    min-height: 44px;
  }
}
</style>