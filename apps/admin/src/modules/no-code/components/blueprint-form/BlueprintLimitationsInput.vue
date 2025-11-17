<script setup lang="ts">

import AddMore from '@/modules/core/components/forms/AddMore.vue';
import PermissionScopeSelector from '@/modules/no-code/components/PermissionScopeSelector.vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import { IBlueprintLimitation, IBlueprintPropertyDescriptor, PermissionScope } from '@qelos/global-types';
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const model = defineModel<Array<IBlueprintLimitation>>()

const props = defineProps<{
  permissionScope: PermissionScope,
  properties: Record<string, IBlueprintPropertyDescriptor>;
}>()

const { t } = useI18n()

// Sample roles and workspace labels for the demo
// In a real implementation, these would be fetched from an API
const availableRoles = ref(['admin', 'editor', 'viewer', 'manager', 'user'])
const availableWorkspaceLabels = ref(['free', 'basic', 'premium', 'enterprise', 'supplier', 'partner', 'consumer'])

// Computed property to check if there are any limitations defined
const hasLimitations = computed(() => model.value && model.value.length > 0)

// Validate if a limitation has the minimum required fields filled
const isLimitationValid = (limitation: IBlueprintLimitation) => {
  return limitation.value > 0
}

// Generate a human-readable description of the limitation
const getLimitationDescription = (limitation: IBlueprintLimitation) => {
  let scopeText = '';
  switch (limitation.scope) {
    case PermissionScope.USER:
      scopeText = t('each user');
      break;
    case PermissionScope.WORKSPACE:
      scopeText = t('each workspace');
      break;
    case PermissionScope.TENANT:
      scopeText = t('the entire application');
      break;
    default:
      scopeText = t('each user');
  }
  
  let description = t('For {0} there can only be {1} entities', [scopeText, limitation.value]);
  
  // Add properties condition if specified
  if (limitation.properties.length > 0) {
    const propertyNames = limitation.properties.map(key => {
      return props.properties[key]?.title || key;
    }).join(', ');
    description += t(' that have the same values for [{0}]', [propertyNames]);
  }
  
  // Add roles condition if specified
  if (limitation.roles.length > 0) {
    description += t(' where the user has roles [{0}]', [limitation.roles.join(', ')]);
  }
  
  // Add workspace labels condition if specified
  if (limitation.workspaceLabels.length > 0) {
    description += t(' and when the workspace has labels [{0}]', [limitation.workspaceLabels.join(', ')]);
  }
  
  return description + '.';
}

function addLimitation() {
  if (!model.value) {
    model.value = [];
  }
  model.value.push({
    scope: props.permissionScope || PermissionScope.USER,
    value: 1,
    roles: [],
    workspaceLabels: [],
    properties: []
  })
}

function removeLimitation(index: number) {
  if (model.value) {
    model.value.splice(index, 1)
  }
}
</script>

<template>
  <div class="blueprint-limitations">
    <!-- Empty state when no limitations exist -->
    <div v-if="!hasLimitations" class="empty-state">
      <p class="empty-message">{{ $t('No limitations defined yet. Add your first limitation below.') }}</p>
    </div>
    
    <!-- Limitations list -->
    <div v-for="(limit, index) in model" :key="index" class="limitation-card">
      <div class="limitation-header">
        <h4>{{ $t('Limitation') }} #{{ index + 1 }}</h4>
        <RemoveButton 
          @click="removeLimitation(index)" 
          :tooltip="$t('Remove this limitation')" 
          class="remove-button"
        />
      </div>
      
      <div class="limitation-body">
        <!-- Top row with scope and limit amount -->
        <div class="limitation-top-row">
          <div class="scope-selector-container">
            <el-form-item class="scope-selector">
              <template #label>
                {{ $t('Scope') }}
                <InfoIcon content="Permission scope determines the level at which the limitation is applied."/>
              </template>
              <PermissionScopeSelector v-model="limit.scope"/>
            </el-form-item>
          </div>
          
          <div class="limit-amount-container">
            <FormInput 
              v-model="limit.value" 
              type="number" 
              title="Limit Amount" 
              :placeholder="$t('Enter limit value')"
              :min="1"
              class="limit-amount"
            />
          </div>
        </div>
        
        <!-- Properties selector (full width) -->
        <el-form-item class="properties-selector">
          <template #label>
            {{ $t('Properties') }}
            <InfoIcon content="Select the properties this limitation applies to. Leave empty to apply to all properties."/>
          </template>
          <el-select 
            multiple
            filterable
            allow-create
            default-first-option
            v-model="limit.properties"
            :placeholder="$t('Select properties or leave empty for all')"
            class="full-width-select">
            <el-option 
              v-for="(prop, key) in props.properties" 
              :key="key" 
              :label="prop.title" 
              :value="key"/>
          </el-select>
        </el-form-item>
        
        <!-- Bottom row with roles and workspace labels -->
        <div class="limitation-bottom-row">
          <div class="roles-container">
            <el-form-item>
              <template #label>
                {{ $t('User Roles') }}
                <InfoIcon content="Limit will apply only to users with these roles. Leave empty to apply to all roles."/>
              </template>
              <el-select 
                multiple
                filterable
                allow-create
                default-first-option
                v-model="limit.roles"
                :placeholder="$t('Select roles or leave empty for all')"
                class="full-width-select">
                <el-option 
                  v-for="role in availableRoles" 
                  :key="role" 
                  :label="role" 
                  :value="role"/>
              </el-select>
            </el-form-item>
          </div>
          
          <div class="workspace-labels-container">
            <el-form-item>
              <template #label>
                {{ $t('Workspace Labels') }}
                <InfoIcon content="Limit will apply only to workspaces with these labels. Leave empty to apply to all workspaces."/>
              </template>
              <el-select 
                multiple
                filterable
                allow-create
                default-first-option
                v-model="limit.workspaceLabels"
                :placeholder="$t('Select workspace labels or leave empty for all')"
                class="full-width-select">
                <el-option 
                  v-for="label in availableWorkspaceLabels" 
                  :key="label" 
                  :label="label" 
                  :value="label"/>
              </el-select>
            </el-form-item>
          </div>
        </div>
        
        <!-- Limitation description -->
        <div class="limitation-description">
          <div class="description-container">
            <div class="description-icon">
              <i class="el-icon-info"></i>
            </div>
            <div class="description-text">
              {{ getLimitationDescription(limit) }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add more button -->
    <AddMore 
      @click="addLimitation" 
      :label="hasLimitations ? $t('Add another limitation') : $t('Add limitation')"
    />
  </div>
</template>

<style scoped>
.blueprint-limitations {
  margin-bottom: 1.5rem;
  width: 100%;
}

.limitation-card {
  margin-bottom: 1.5rem;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
  width: 100%;
}

.limitation-card:hover {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.limitation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background-color: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-lighter);
  width: 100%;
}

.limitation-header h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.limitation-body {
  padding: 1rem;
  width: 100%;
}

.limitation-top-row,
.limitation-bottom-row {
  display: flex;
  gap: 1.5rem;
  width: 100%;
  margin-bottom: 1rem;
}

.scope-selector-container,
.limit-amount-container,
.roles-container,
.workspace-labels-container {
  flex: 1;
  min-width: 0; /* Prevents flex items from overflowing */
}

.properties-selector {
  margin-bottom: 1.5rem;
  width: 100%;
}

.remove-button {
  margin-inline-start: auto;
}

.scope-selector {
  margin-bottom: 0;
}

.full-width-select {
  width: 100%;
}

.limit-amount {
  margin: 0;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
  margin-bottom: 1rem;
  width: 100%;
}

.empty-message {
  color: var(--el-text-color-secondary);
  font-size: 0.95rem;
}

.limitation-description {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: var(--el-fill-color-lighter);
  border-radius: 6px;
  border-left: 4px solid var(--el-color-primary);
}

.description-container {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.description-icon {
  color: var(--el-color-primary);
  font-size: 1.25rem;
  margin-top: 0.125rem;
}

.description-text {
  flex: 1;
  color: var(--el-text-color-regular);
  font-size: 0.95rem;
  line-height: 1.5;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .limitation-top-row,
  .limitation-bottom-row {
    flex-direction: column;
    gap: 1rem;
  }
  
  .scope-selector-container,
  .limit-amount-container,
  .roles-container,
  .workspace-labels-container {
    width: 100%;
  }
}
</style>