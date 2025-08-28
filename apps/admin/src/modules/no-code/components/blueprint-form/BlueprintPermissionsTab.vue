<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import PermissionScopeSelector from '@/modules/no-code/components/PermissionScopeSelector.vue';
import CrudOperationSelector from '@/modules/no-code/components/CrudOperationSelector.vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import WorkspaceLabelSelector from '@/modules/no-code/components/WorkspaceLabelSelector.vue';
import { IBlueprint } from '@qelos/global-types';

const props = defineProps({
  availableLabels: {
    type: Array as () => string[],
    default: () => ['*', 'supplier', 'store', 'consumer']
  }
});

const permissions = defineModel<IBlueprint['permissions']>('permissions');
const permissionScope = defineModel<IBlueprint['permissionScope']>('scope');

function getSummaryTitle(permission) {
  return permission.guest 
    ? `Guest can ${permission.operation}` 
    : `User can ${permission.operation}`;
}

function getSummaryDescription(permission) {
  if (permission.guest) {
    return `Any guest (unauthenticated user) will be allowed to ${permission.operation.toLowerCase()} entities of this blueprint.`;
  }
  
  const conditions = [];
  
  if (permission.roleBased?.length) {
    conditions.push(`has one of these roles: ${permission.roleBased.join(', ')}`);
  }
  
  if (permission.workspaceRoleBased?.length) {
    conditions.push(`has one of these workspace roles: ${permission.workspaceRoleBased.join(', ')}`);
  }
  
  if (permission.workspaceLabelsBased?.length) {
    conditions.push(`belongs to a workspace with one of these labels: ${permission.workspaceLabelsBased.join(', ')}`);
  }
  
  if (conditions.length === 0) {
    return `Any authenticated user will be allowed to ${permission.operation.toLowerCase()} entities of this blueprint.`;
  }
  
  return `A user will be allowed to ${permission.operation.toLowerCase()} entities of this blueprint when they ${conditions.join(' AND ')}.`;
}

function addNewPermission() {
  const updatedPermissions = [...permissions.value];
  
  updatedPermissions.push({ 
    operation: '' as IBlueprint['permissions'][number]['operation'], 
    guest: false, 
    workspaceRoleBased: [], 
    roleBased: [], 
    workspaceLabelsBased: ['*'] 
  });
  
  permissions.value = updatedPermissions;
}

function removePermission(permission) {
  const updatedPermissions = [...permissions.value];
  const index = updatedPermissions.indexOf(permission);
  
  if (index !== -1) {
    updatedPermissions.splice(index, 1);
    permissions.value = updatedPermissions;
  }
}
</script>

<template>
  <div class="rbac-container">
    <div class="rbac-header">
      <h3>{{ $t('Blueprint Permission Scope') }}</h3>
      <p class="rbac-description">
        {{ $t('This determines the overall permission scope for the blueprint.') }}
        <InfoIcon content="The permission scope defines the level at which permissions are applied by default for this blueprint."/>
      </p>
      <PermissionScopeSelector v-model="permissionScope"/>
    </div>
    
    <div class="rbac-rules-container">
      <h3>{{ $t('Permission Rules') }}</h3>
      <p class="rbac-description">
        {{ $t('Define who can perform specific operations on entities of this blueprint.') }}
      </p>
      
      <el-card v-for="(permission, index) in permissions" :key="index"
              class="permission-card" :class="{ 'guest-permission': permission.guest }">
        <template #header>
          <div class="permission-card-header">
            <h4>{{ $t('Rule') }} #{{ index + 1 }}</h4>
            <el-button type="danger" circle @click="removePermission(permission)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </template>
        
        <div class="permission-config">
          <div class="permission-type-section">
            <h5>{{ $t('Who & What') }}</h5>
            <div class="permission-type-controls">
              <FormInput type="switch" v-model="permission.guest" title="Guest Access" class="flex-0"/>
              <CrudOperationSelector v-model="permission.operation" class="flex-1"/>
            </div>
          </div>
          
          <template v-if="!permission.guest">
            <div class="permission-conditions-section">
              <h5>{{ $t('Conditions') }}</h5>
              <div class="permission-scope-container">
                <PermissionScopeSelector v-model="permission.scope" class="flex-1"/>
              </div>
              
              <div class="permission-roles-container">
                <LabelsInput title="User Roles" 
                            info="The user must have at least one of these roles to be granted this permission"
                            v-model="permission.roleBased" 
                            class="roles-input"/>
                
                <LabelsInput title="Workspace Roles" 
                            info="The user must have at least one of these workspace roles to be granted this permission"
                            v-model="permission.workspaceRoleBased" 
                            class="roles-input"/>
                
                <WorkspaceLabelSelector 
                    class="roles-input" 
                    v-model="permission.workspaceLabelsBased"
                    :availableLabels="availableLabels" 
                    title="Workspace Labels"
                    info="The user's workspace must have at least one of these labels to be granted this permission"/>
              </div>
            </div>
          </template>
        </div>
        
        <div class="permission-summary">
          <h5>{{ $t('Summary') }}</h5>
          <div class="permission-summary-content">
            <el-alert
              :title="getSummaryTitle(permission)"
              :description="getSummaryDescription(permission)"
              type="info"
              show-icon
            />
          </div>
        </div>
      </el-card>
      
      <div class="add-permission-container">
        <el-button type="primary" @click="addNewPermission">
          <el-icon><Plus /></el-icon>
          {{ $t('Add Permission Rule') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rbac-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.rbac-header, .rbac-rules-container {
  background-color: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 1.5rem;
}

.rbac-description {
  color: var(--el-text-color-secondary);
  margin-bottom: 1rem;
}

.permission-card {
  margin-bottom: 1.5rem;
  border: 1px solid var(--el-border-color-light);
  transition: all 0.3s;
}

.permission-card:hover {
  box-shadow: var(--el-box-shadow-light);
}

.guest-permission {
  border-left: 4px solid var(--el-color-warning);
}

.permission-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.permission-config {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.permission-type-section, .permission-conditions-section {
  padding: 1rem;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
}

.permission-type-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.permission-scope-container, .permission-roles-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

.permission-summary {
  margin-top: 1.5rem;
}

.permission-summary-content {
  margin-top: 0.5rem;
}

.add-permission-container {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.roles-input {
  min-width: 100%;
  margin-bottom: 0.5rem;
}

h5 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
