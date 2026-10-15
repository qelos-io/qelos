<script setup lang="ts">
import { ref, watch, computed } from 'vue';
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

// Roles are a mapping value: a JSON list typed by hand or picked below, or an expression such as .data.roles
const KNOWN_ROLES = ['admin', 'editor', 'user'];

const rolesArray = computed<string[]>(() => {
  try {
    const parsed = qelosDetails.value.roles ? JSON.parse(qelosDetails.value.roles) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
});

/** the picker only applies while the value is empty or a plain list, not an expression */
const rolesPickable = computed(() => {
  if (!qelosDetails.value.roles) return true;
  try {
    return Array.isArray(JSON.parse(qelosDetails.value.roles));
  } catch (e) {
    return false;
  }
});
const roleChoices = computed(() => [...new Set([...KNOWN_ROLES, ...rolesArray.value])]);

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

const toggleRole = (role: string) => {
  const roles = rolesArray.value.includes(role) ? rolesArray.value.filter((item) => item !== role) : [...rolesArray.value, role];
  qelosDetails.value.roles = roles.length ? JSON.stringify(roles) : '';
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
  <el-form label-position="top" class="qelos-target-config" @submit.prevent>
    <!-- Webhook -->
    <template v-if="operation === QelosTargetOperation.webhook">
      <div class="two">
        <el-form-item :label="$t('Event kind')"><el-input v-model="qelosDetails.kind" dir="ltr" placeholder="users" @input="syncQelosDetailsToTargetDetails" /></el-form-item>
        <el-form-item :label="$t('Event name')"><el-input v-model="qelosDetails.eventName" dir="ltr" placeholder="user-created" @input="syncQelosDetailsToTargetDetails" /></el-form-item>
      </div>
      <el-form-item :label="$t('Description')"><el-input v-model="qelosDetails.description" dir="auto" :placeholder="$t('Event description')" @input="syncQelosDetailsToTargetDetails" /></el-form-item>
    </template>

    <!-- Create / update a user, set roles -->
    <template v-else-if="operation === QelosTargetOperation.createUser || operation === QelosTargetOperation.updateUser || operation === QelosTargetOperation.setUserRoles">
      <p class="hint">{{ $t('Each field takes a value from your data steps, written like .data.email, or a fixed value.') }}</p>
      <el-form-item v-if="operation !== QelosTargetOperation.createUser" :label="$t('User ID')">
        <el-input v-model="qelosDetails.userId" dir="ltr" placeholder=".data.userId" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
      <el-form-item v-if="operation !== QelosTargetOperation.setUserRoles" :label="operation === QelosTargetOperation.updateUser ? $t('Password (optional)') : $t('Password')">
        <el-input v-model="qelosDetails.password" dir="ltr" placeholder=".data.password" @input="syncQelosDetailsToTargetDetails" />
      </el-form-item>
      <el-form-item :label="operation === QelosTargetOperation.updateUser ? $t('Roles (optional)') : $t('Roles')">
        <el-input v-model="qelosDetails.roles" dir="ltr" placeholder='.data.roles  or  ["user"]' @input="syncQelosDetailsToTargetDetails" />
        <div v-if="rolesPickable" class="role-picks" role="group" :aria-label="$t('Pick roles')">
          <button v-for="role in roleChoices" :key="role" type="button" class="pick" :class="{ on: rolesArray.includes(role) }" :aria-pressed="rolesArray.includes(role)" @click="toggleRole(role)">{{ role }}</button>
        </div>
        <p v-else class="hint">{{ $t('This value is an expression, so it is used as written.') }}</p>
      </el-form-item>
    </template>

    <p v-else-if="operation === QelosTargetOperation.setWorkspaceLabels" class="hint">{{ $t('This operation is not fully supported yet.') }}</p>

    <!-- Blueprint entity -->
    <el-form-item v-else-if="operation === QelosTargetOperation.createBlueprintEntity || operation === QelosTargetOperation.updateBlueprintEntity" :label="$t('Blueprint')">
      <BlueprintDropdown v-model="qelosDetails.blueprint" @change="syncQelosDetailsToTargetDetails" />
    </el-form-item>
  </el-form>
</template>

<style scoped lang="scss">
.qelos-target-config {
  max-inline-size: 640px;
}

.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 14px;
}

.hint {
  margin: 0 0 12px;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
  text-align: start;
}

.role-picks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-block-start: 8px;
}

.pick {
  padding: 2px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;

  &.on {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

@media (max-width: 640px) {
  .two {
    grid-template-columns: 1fr;
  }
}
</style>
