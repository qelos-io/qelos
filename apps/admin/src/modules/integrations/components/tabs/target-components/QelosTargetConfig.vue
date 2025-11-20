<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
import BlueprintDropdown from '@/modules/integrations/components/BlueprintDropdown.vue';
import { QelosTargetOperation } from '@qelos/global-types';

const props = defineProps<{
  modelValue: any;
  operation: string;
}>();

const emit = defineEmits(['update:modelValue']);

// Qelos target UI state
const qelosDetails = ref({
  eventName: '',
  kind: '',
  description: '',
  password: '',
  roles: '',
  userId: '',
  blueprint: '',
  metadata: {},
  source: '',
});

// Roles input UI state
const roleInputVisible = ref(false);
const roleInputValue = ref('');
const roleInputRef = ref<{ input: HTMLInputElement } | null>(null);

// Computed property for roles array
const rolesArray = computed(() => {
  try {
    return qelosDetails.value.roles ? JSON.parse(qelosDetails.value.roles) : [];
  } catch (e) {
    return [];
  }
});

// Initialize component with existing data if available
const initQelosDetails = () => {
  if (props.modelValue?.details) {
    qelosDetails.value = {
      eventName: props.modelValue.details.eventName || '',
      description: props.modelValue.details.description || '',
      password: props.modelValue.details.password || '',
      roles: props.modelValue.details.roles || '',
      userId: props.modelValue.details.userId || '',
      blueprint: props.modelValue.details.blueprint || '',
      metadata: props.modelValue.details.metadata || {},
      source: props.modelValue.source,
      kind: props.modelValue.details.kind || ''
    };
  }
};

// Roles input methods
const showRoleInput = () => {
  roleInputVisible.value = true;
  nextTick(() => {
    roleInputRef.value?.input?.focus();
  });
};

const handleRoleRemove = (tag: string) => {
  const roles = rolesArray.value.filter(role => role !== tag);
  qelosDetails.value.roles = JSON.stringify(roles);
  syncQelosDetailsToTargetDetails();
};

const handleRoleConfirm = () => {
  if (roleInputValue.value) {
    const roles = [...rolesArray.value, roleInputValue.value];
    qelosDetails.value.roles = JSON.stringify(roles);
  }
  roleInputVisible.value = false;
  roleInputValue.value = '';
  syncQelosDetailsToTargetDetails();
};

// Sync UI state to form.target.details
const syncQelosDetailsToTargetDetails = () => {
  const newModelValue = { ...props.modelValue };
  
  // Set details based on operation type
  if (props.operation === QelosTargetOperation.createBlueprintEntity || 
      props.operation === QelosTargetOperation.updateBlueprintEntity) {
    // For blueprint operations, only include blueprint and metadata
    newModelValue.details = {
      blueprint: qelosDetails.value.blueprint,
      metadata: qelosDetails.value.metadata
    };
  } else if (props.operation === QelosTargetOperation.webhook) {
    // For webhook, only include eventName and description
    newModelValue.details = {
      eventName: qelosDetails.value.eventName,
      description: qelosDetails.value.description,
      source: qelosDetails.value.source,
      kind: qelosDetails.value.kind,
    };
  } else if (props.operation === QelosTargetOperation.createUser) {
    // For createUser, include password, roles, and userId
    newModelValue.details = {
      password: qelosDetails.value.password,
      roles: qelosDetails.value.roles,
      userId: qelosDetails.value.userId
    };
  } else if (props.operation === QelosTargetOperation.updateUser) {
    // For updateUser, include userId, password, and roles
    newModelValue.details = {
      userId: qelosDetails.value.userId,
      password: qelosDetails.value.password,
      roles: qelosDetails.value.roles
    };
  } else if (props.operation === QelosTargetOperation.setUserRoles) {
    // For setUserRoles, include userId and roles
    newModelValue.details = {
      userId: qelosDetails.value.userId,
      roles: qelosDetails.value.roles
    };
  } else {
    // Default fallback for other operations
    newModelValue.details = { ...qelosDetails.value };
  }
  
  emit('update:modelValue', newModelValue);
};

// Initialize on mount and when modelValue changes
watch(() => props.modelValue, initQelosDetails, { immediate: true });
</script>

<template>
  <div class="qelos-target-config">
    <!-- Webhook -->
    <div v-if="operation === QelosTargetOperation.webhook" class="webhook-config">
      <el-form-item :label="$t('Event Kind')">
        <el-input v-model="qelosDetails.kind" placeholder="e.g., users, orders" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
      
      <el-form-item :label="$t('Event Name')">
        <el-input v-model="qelosDetails.eventName" placeholder="e.g., user.created" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>

      <el-form-item :label="$t('Description')">
        <el-input v-model="qelosDetails.description" placeholder="Event description" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
    </div>
    
    <!-- Create User -->
    <div v-else-if="operation === QelosTargetOperation.createUser" class="user-config">
      <p class="config-description">{{ $t('Map these fields from your data manipulation steps:') }}</p>
      
      <el-form-item :label="$t('Password')">
        <el-input v-model="qelosDetails.password" placeholder="e.g., .data.password" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
      
      <el-form-item :label="$t('Roles')">
        <el-input v-model="qelosDetails.roles" placeholder="e.g., .data.roles or ['user']" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
      
      <el-form-item :label="$t('User ID')">
        <el-input v-model="qelosDetails.userId" placeholder="e.g., .data.userId" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
      
      <el-form-item :label="$t('Roles')">
        <el-tag
          :key="tag"
          v-for="tag in rolesArray"
          closable
          :disable-transitions="false"
          @close="handleRoleRemove(tag)"
          class="mr-1 mb-1"
        >
          {{ tag }}
        </el-tag>
        <el-input
          v-if="roleInputVisible"
          ref="roleInputRef"
          v-model="roleInputValue"
          class="ml-1 w-auto"
          size="small"
          @keyup.enter="handleRoleConfirm"
          @blur="handleRoleConfirm"
        />
        <el-button v-else class="button-new-tag ml-1" size="small" @click="showRoleInput">
          + {{ $t('Add role') }}
        </el-button>
      </el-form-item>
    </div>
    
    <!-- Update User -->
    <div v-else-if="operation === QelosTargetOperation.updateUser" class="user-config">
      <p class="config-description">{{ $t('Map these fields from your data manipulation steps:') }}</p>
      
      <el-form-item :label="$t('User ID')">
        <el-input v-model="qelosDetails.userId" placeholder="e.g., .data.userId" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
      
      <el-form-item :label="$t('Password (Optional)')">
        <el-input v-model="qelosDetails.password" placeholder="e.g., .data.password" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
      
      <el-form-item :label="$t('Roles (Optional)')">
        <el-input v-model="qelosDetails.roles" placeholder="e.g., .data.roles or ['user']" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
    </div>
    
    <!-- Set User Roles -->
    <div v-else-if="operation === QelosTargetOperation.setUserRoles" class="user-config">
      <p class="config-description">{{ $t('Map these fields from your data manipulation steps:') }}</p>
      
      <el-form-item :label="$t('User ID')">
        <el-input v-model="qelosDetails.userId" placeholder="e.g., .data.userId" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
      
      <el-form-item :label="$t('Roles')">
        <el-tag
          :key="tag"
          v-for="tag in rolesArray"
          closable
          :disable-transitions="false"
          @close="handleRoleRemove(tag)"
          class="mr-1 mb-1"
        >
          {{ tag }}
        </el-tag>
        <el-input
          v-if="roleInputVisible"
          ref="roleInputRef"
          v-model="roleInputValue"
          class="ml-1 w-auto"
          size="small"
          @keyup.enter="handleRoleConfirm"
          @blur="handleRoleConfirm"
        />
        <el-button v-else class="button-new-tag ml-1" size="small" @click="showRoleInput">
          + {{ $t('Add role') }}
        </el-button>
      </el-form-item>
    </div>
    
    <!-- Set Workspace Labels -->
    <div v-else-if="operation === QelosTargetOperation.setWorkspaceLabels" class="workspace-config">
      <p class="config-description">{{ $t('This operation is not fully supported yet.') }}</p>
    </div>
    
    <!-- Create Blueprint Entity -->
    <div v-else-if="operation === QelosTargetOperation.createBlueprintEntity || operation === QelosTargetOperation.updateBlueprintEntity" class="blueprint-config">
      <el-form-item :label="$t('Blueprint')">
        <BlueprintDropdown v-model="qelosDetails.blueprint" @change="syncQelosDetailsToTargetDetails" />
      </el-form-item>
    </div>
  </div>
</template>

<style scoped>
.qelos-target-config {
  width: 100%;
}

.config-description {
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
  margin-block-end: 15px;
}

.mr-1 {
  margin-inline-end: 0.25rem;
}

.mb-1 {
  margin-block-end: 0.25rem;
}

.ml-1 {
  margin-inline-start: 0.25rem;
}

.w-auto {
  width: auto;
}
</style>
