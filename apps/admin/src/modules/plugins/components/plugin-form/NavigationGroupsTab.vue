<template>
  <div 
    class="tab-content" 
    role="region" 
    tabindex="-1"
    :aria-label="$t('Navigation groups configuration')">
    
    <!-- Plugin's Own Groups Section -->
    <el-card class="settings-card">
      <template #header>
        <div class="card-header" id="plugin-groups-section">
          <div class="header-left">
            <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'layer-group']" /></el-icon>
            <span>{{ $t('This Plugin\'s Navigation Groups') }}</span>
          </div>
          <el-button 
            type="primary" 
            @click="addNewGroup" 
            class="add-button"
            :aria-label="$t('Add new navigation group')">
            <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'plus']" /></el-icon>
            <span class="button-text">{{ $t('Add Group') }}</span>
          </el-button>
        </div>
      </template>

      <el-table 
        :data="pluginGroups" 
        style="width: 100%"
        :empty-text="$t('No navigation groups defined')"
        row-key="key">
        <el-table-column prop="key" :label="$t('Key')" min-width="120">
          <template #default="{ row, $index }">
            <el-input 
              v-if="isEditing(row, $index)" 
              v-model="tempEditValues[$index].key" 
              :placeholder="$t('Group key')"
              @keydown.enter.prevent="saveGroup(row, $index)"
              dir="ltr" />
            <code v-else>{{ row.key }}</code>
          </template>
        </el-table-column>
        
        <el-table-column prop="name" :label="$t('Name')" min-width="150">
          <template #default="{ row, $index }">
            <el-input 
              v-if="isEditing(row, $index)" 
              v-model="tempEditValues[$index].name" 
              :placeholder="$t('Group name')"
              @keydown.enter.prevent="saveGroup(row, $index)" />
            <span v-else>{{ row.name }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="iconName" :label="$t('Icon')" min-width="120">
          <template #default="{ row, $index }">
            <div class="icon-input-group" v-if="isEditing(row, $index)">
              <el-input 
                v-model="tempEditValues[$index].iconName" 
                :placeholder="$t('Icon name')"
                @keydown.enter.prevent="saveGroup(row, $index)"
                dir="ltr" />
              <el-button 
                size="small" 
                @click="openIconSelector(row, $index)"
                :aria-label="$t('Select icon')">
                <el-icon><font-awesome-icon :icon="['fas', 'icons']" /></el-icon>
              </el-button>
            </div>
            <div class="icon-display" v-else>
              <el-icon v-if="row.iconName">
                <component :is="getElementPlusIcon(row.iconName)" />
              </el-icon>
              <span v-if="row.iconName">{{ row.iconName }}</span>
              <span v-else class="no-icon">-</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="priority" :label="$t('Priority')" width="100">
          <template #default="{ row, $index }">
            <el-input-number 
              v-if="isEditing(row, $index)" 
              v-model="tempEditValues[$index].priority" 
              :min="0"
              :max="99999"
              size="small" />
            <span v-else>{{ row.priority || 99999 }}</span>
          </template>
        </el-table-column>
        
        <el-table-column :label="$t('Micro-frontends')" min-width="200">
          <template #default="{ row }">
            <el-tag 
              v-for="mfe in getGroupMicroFrontends(row.key)" 
              :key="mfe.name"
              size="small"
              class="mfe-tag">
              {{ mfe.name }}
            </el-tag>
            <span v-if="!getGroupMicroFrontends(row.key).length" class="no-mfes">
              {{ $t('No micro-frontends assigned') }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column :label="$t('Actions')" width="150" fixed="right">
          <template #default="{ row, $index }">
            <div class="action-buttons">
              <template v-if="isEditing(row, $index)">
                <el-button 
                  size="small" 
                  type="success"
                  @click.stop="saveGroup(row, $index)"
                  @keydown.enter.stop="saveGroup(row, $index)"
                  :aria-label="$t('Save group')">
                  <el-icon><font-awesome-icon :icon="['fas', 'check']" /></el-icon>
                </el-button>
                <el-button 
                  size="small" 
                  type="info"
                  @click.stop="cancelEdit(row, $index)"
                  @keydown.enter.stop="cancelEdit(row, $index)"
                  :aria-label="$t('Cancel edit')">
                  <el-icon><font-awesome-icon :icon="['fas', 'times']" /></el-icon>
                </el-button>
              </template>
              <template v-else>
                <el-button 
                  size="small" 
                  type="primary"
                  @click="editGroup(row, $index)"
                  :aria-label="$t('Edit group')">
                  <el-icon><font-awesome-icon :icon="['fas', 'edit']" /></el-icon>
                </el-button>
                <el-button 
                  size="small" 
                  type="danger"
                  @click="deleteGroup($index)"
                  :aria-label="$t('Delete group')"
                  :disabled="getGroupMicroFrontends(row.key).length > 0">
                  <el-icon><font-awesome-icon :icon="['fas', 'trash']" /></el-icon>
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- All Available Groups Reference -->
    <el-card class="settings-card">
      <template #header>
        <div class="card-header" id="all-groups-section">
          <div class="header-left">
            <el-icon aria-hidden="true"><font-awesome-icon :icon="['fas', 'compass']" /></el-icon>
            <span>{{ $t('All Available Navigation Groups') }}</span>
          </div>
          <el-tooltip :content="$t('Groups from all plugins that you can use for your micro-frontends')" placement="top">
            <el-icon class="info-icon"><font-awesome-icon :icon="['fas', 'info-circle']" /></el-icon>
          </el-tooltip>
        </div>
      </template>

      <el-table 
        :data="allAvailableGroups" 
        style="width: 100%"
        :empty-text="$t('No groups available')"
        row-key="key">
        <el-table-column prop="key" :label="$t('Key')" min-width="120">
          <template #default="{ row }">
            <code>{{ row.key }}</code>
          </template>
        </el-table-column>
        
        <el-table-column prop="name" :label="$t('Name')" min-width="150">
          <template #default="{ row }">
            <span>{{ row.name }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="pluginName" :label="$t('Source Plugin')" min-width="150">
          <template #default="{ row }">
            <el-tag v-if="row.isCurrentPlugin" type="success" size="small">
              {{ $t('This Plugin') }}
            </el-tag>
            <span v-else>{{ row.pluginName }}</span>
          </template>
        </el-table-column>
        
        <el-table-column prop="iconName" :label="$t('Icon')" min-width="120">
          <template #default="{ row }">
            <div class="icon-display">
              <el-icon v-if="row.iconName">
                <component :is="getElementPlusIcon(row.iconName)" />
              </el-icon>
              <span v-if="row.iconName">{{ row.iconName }}</span>
              <span v-else class="no-icon">-</span>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column :label="$t('Micro-frontends')" min-width="200">
          <template #default="{ row }">
            <el-tag 
              v-for="mfe in getGroupMicroFrontends(row.key)" 
              :key="mfe.name"
              size="small"
              class="mfe-tag">
              {{ mfe.name }}
            </el-tag>
            <span v-if="!getGroupMicroFrontends(row.key).length" class="no-mfes">
              {{ $t('No micro-frontends assigned') }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Icon Selector Dialog -->
    <el-dialog 
      v-model="iconSelectorVisible" 
      :title="$t('Select Icon')"
      width="800px"
      append-to-body>
      <IconSelector 
        v-if="iconSelectorVisible"
        v-model="tempIconName"
        @update:modelValue="handleIconSelect" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, toRefs } from 'vue';
import { usePluginsList } from '@/modules/plugins/store/plugins-list';
import { IPlugin, IMicroFrontend } from '@/services/types/plugin';
import { INavbarGroup } from '@qelos/global-types';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import IconSelector from '@/modules/core/components/forms/IconSelector.vue';

const props = defineProps<{
  plugin: Partial<IPlugin>;
}>();

// Store references
const { plugins } = toRefs(usePluginsList());

// Reactive plugin data
const edit = reactive<Partial<IPlugin>>(props.plugin || {});

// Ensure navBarGroups array exists
if (!edit.navBarGroups) {
  edit.navBarGroups = [];
}

// Icon selector state
const iconSelectorVisible = ref(false);
const tempIconName = ref('');
const currentEditingRow = ref<{ row: INavbarGroup; index: number } | null>(null);

// Track editing state separately
const editingStates = ref<Record<number, boolean>>({});
const originalValues = ref<Record<number, INavbarGroup>>({});
const tempEditValues = ref<Record<number, Partial<INavbarGroup>>>({});

// Get all plugins with their groups
const allPlugins = computed(() => plugins.value || []);

// Get this plugin's groups for editing
const pluginGroups = computed(() => {
  return edit.navBarGroups || [];
});

// Get all available groups from all plugins
const allAvailableGroups = computed(() => {
  const groupsMap = new Map();
  
  allPlugins.value.forEach(plugin => {
    if (plugin.navBarGroups) {
      plugin.navBarGroups.forEach(group => {
        if (!groupsMap.has(group.key)) {
          groupsMap.set(group.key, {
            ...group,
            pluginName: plugin.name,
            isCurrentPlugin: plugin._id === edit._id
          });
        }
      });
    }
  });
  
  return Array.from(groupsMap.values()).sort((a, b) => (a.priority || 99999) - (b.priority || 99999));
});

// Get micro-frontends assigned to a specific group across ALL plugins
function getGroupMicroFrontends(groupKey: string): IMicroFrontend[] {
  const mfes: IMicroFrontend[] = [];
  
  // Check all plugins' micro-frontends
  allPlugins.value.forEach(plugin => {
    if (plugin.microFrontends) {
      plugin.microFrontends.forEach(mfe => {
        if (mfe.route?.group === groupKey) {
          mfes.push(mfe);
        }
      });
    }
  });
  
  return mfes;
}

// Add new group
function addNewGroup() {
  if (!edit.navBarGroups) {
    edit.navBarGroups = [];
  }
  
  const newGroup: INavbarGroup = {
    key: '',
    name: '',
    iconName: '',
    priority: 99999
  };
  
  const index = edit.navBarGroups.length;
  edit.navBarGroups.push(newGroup);
  editingStates.value[index] = true;
  originalValues.value[index] = { ...newGroup };
  tempEditValues.value[index] = { ...newGroup };
}

// Edit group
function editGroup(row: INavbarGroup, index: number) {
  editingStates.value[index] = true;
  originalValues.value[index] = { ...row };
  tempEditValues.value[index] = { ...row };
}

// Save group
function saveGroup(row: INavbarGroup, index: number) {
  // Apply the temporary values to the actual row
  if (tempEditValues.value[index]) {
    Object.assign(row, tempEditValues.value[index]);
  }
  delete editingStates.value[index];
  delete originalValues.value[index];
  delete tempEditValues.value[index];
}

// Cancel edit
function cancelEdit(row: INavbarGroup, index: number) {
  if (originalValues.value[index]) {
    // Restore original values
    Object.assign(row, originalValues.value[index]);
    delete originalValues.value[index];
  } else {
    // If it's a new row, remove it
    if (edit.navBarGroups) {
      edit.navBarGroups.splice(index, 1);
    }
  }
  delete editingStates.value[index];
  delete tempEditValues.value[index];
}

// Delete group
function deleteGroup(index: number) {
  if (edit.navBarGroups) {
    edit.navBarGroups.splice(index, 1);
  }
}

// Icon selector functions
function openIconSelector(row: INavbarGroup, index: number) {
  currentEditingRow.value = { row, index };
  tempIconName.value = tempEditValues.value[index]?.iconName || '';
  iconSelectorVisible.value = true;
}

function handleIconSelect(iconName: string) {
  if (currentEditingRow.value) {
    const { index } = currentEditingRow.value;
    if (tempEditValues.value[index]) {
      tempEditValues.value[index].iconName = iconName;
    }
  }
  iconSelectorVisible.value = false;
  currentEditingRow.value = null;
}

// Get Element Plus icon component
function getElementPlusIcon(iconName: string) {
  // Convert kebab-case to PascalCase
  const pascalCaseName = iconName.split('-').map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
  
  return ElementPlusIconsVue[pascalCaseName] || ElementPlusIconsVue.QuestionFilled;
}

// Check if a row is being edited
function isEditing(row: INavbarGroup, index: number): boolean {
  return editingStates.value[index] || false;
}
</script>

<style scoped>
.tab-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 0;
  gap: 1rem;
}

.settings-card {
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

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.add-button {
  margin-inline-start: auto;
}

.button-text {
  margin-inline-start: 0.5rem;
}

.info-icon {
  color: var(--el-text-color-secondary);
  cursor: help;
}

.icon-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.icon-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.no-icon {
  color: var(--el-text-color-placeholder);
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.mfe-tag {
  margin-right: 0.25rem;
  margin-bottom: 0.25rem;
}

.no-mfes {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}

code {
  background-color: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: var(--el-font-family-mono);
  font-size: 0.9em;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .icon-input-group {
    flex-direction: column;
    align-items: stretch;
  }
}

/* Focus states for accessibility */
:deep(.el-button:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

:deep(.el-input:focus-within),
:deep(.el-input-number:focus-within) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
