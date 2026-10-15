<script setup lang="ts">
import { computed } from 'vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import WorkspaceLabelSelector from '@/modules/no-code/components/WorkspaceLabelSelector.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

interface PermissionsConfig {
  roles?: string[];
  workspaceRoles?: string[];
  workspaceLabels?: string[];
}

const permissions = defineModel<PermissionsConfig>('permissions', { default: () => ({}) });
const wsConfiguration = useWsConfiguration();

const availableWorkspaceLabels = computed(() => {
  const labels = wsConfiguration.metadata.labels || [];
  const flattened = labels.flatMap(label => label.value || []);
  const unique = Array.from(new Set(flattened));
  return ['*', ...unique];
});

const safeArray = (value?: string[]) => (Array.isArray(value) ? value : []);

const rolesModel = computed<string[]>({
  get: () => safeArray(permissions.value.roles),
  set: (value) => {
    permissions.value = {
      ...permissions.value,
      roles: value
    };
  }
});

const workspaceRolesModel = computed<string[]>({
  get: () => safeArray(permissions.value.workspaceRoles),
  set: (value) => {
    permissions.value = {
      ...permissions.value,
      workspaceRoles: value
    };
  }
});

const workspaceLabelsModel = computed<string[]>({
  get: () => safeArray(permissions.value.workspaceLabels),
  set: (value) => {
    permissions.value = {
      ...permissions.value,
      workspaceLabels: value
    };
  }
});

const guestAllowed = computed({
  get: () => rolesModel.value.includes('guest'),
  set: (value: boolean) => {
    const withoutGuest = rolesModel.value.filter(role => role !== 'guest');
    rolesModel.value = value ? [...withoutGuest, 'guest'] : withoutGuest;
  }
});
</script>

<template>
  <div class="access-control-step">
    <p class="lead">{{ $t('Control who can trigger this integration by defining user, workspace, or label-based permissions.') }}</p>

    <div class="permissions-grid">
        <el-form-item class="flex-1">
          <template #label>{{ $t('Guest Access') }}</template>
          <el-switch v-model="guestAllowed" />
          <p class="field-hint">{{ $t('Allow unauthenticated users to start conversations with this integration.') }}</p>
        </el-form-item>

        <LabelsInput
          class="flex-1"
          :title="$t('User Roles')"
          :info="$t('Restrict access to users that hold at least one of these platform roles.')"
          v-model="rolesModel"
        >
          <el-option label="All Authenticated (*)" value="*" />
          <el-option label="Admin" value="admin" />
          <el-option label="User" value="user" />
          <el-option label="Guest" value="guest" />
        </LabelsInput>

        <LabelsInput
          class="flex-1"
          :title="$t('Workspace Roles')"
          :info="$t('Require users to hold one of these roles in their workspace.')"
          v-model="workspaceRolesModel"
        >
          <el-option label="All Workspace Roles (*)" value="*" />
          <el-option label="Admin" value="admin" />
          <el-option label="Member" value="member" />
          <el-option label="User" value="user" />
        </LabelsInput>

        <WorkspaceLabelSelector
          class="flex-1"
          :title="$t('Workspace Labels')"
          :available-labels="availableWorkspaceLabels"
          :info="$t('Limit access to workspaces tagged with these labels.')"
          v-model="workspaceLabelsModel"
        />
      </div>
    
  </div>
</template>

<style scoped lang="scss">
.access-control-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-block: 4px;
}

.lead {
  margin: 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.88rem;
  text-align: start;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 20px;
}

.field-hint {
  inline-size: 100%;
  margin: 4px 0 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  line-height: 1.4;
  text-align: start;
}

@media (max-width: 720px) {
  .permissions-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
