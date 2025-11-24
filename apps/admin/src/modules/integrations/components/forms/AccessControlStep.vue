<script setup lang="ts">
import { computed } from 'vue';
import LabelsInput from '@/modules/core/components/forms/LabelsInput.vue';
import WorkspaceLabelSelector from '@/modules/no-code/components/WorkspaceLabelSelector.vue';
import FormRowGroup from '@/modules/core/components/forms/FormRowGroup.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import InfoIcon from '@/modules/pre-designed/components/InfoIcon.vue';
import { Lock } from '@element-plus/icons-vue';

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
    <el-alert
      type="info"
      :closable="false"
      class="mb-4"
    >
      {{ $t('Control who can trigger this integration by defining user, workspace, or label-based permissions.') }}
    </el-alert>

    <el-card class="permissions-card">
      <template #header>
        <div class="card-header">
          <el-icon><Lock /></el-icon>
          <span>{{ $t('Access Rules') }}</span>
        </div>
      </template>

      <FormRowGroup wrap class="permissions-grid">
        <el-form-item class="flex-1">
          <template #label>
            {{ $t('Guest Access') }}
            <InfoIcon :content="$t('Allow unauthenticated users to start conversations with this integration.')" />
          </template>
          <el-switch v-model="guestAllowed" />
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
      </FormRowGroup>
    </el-card>
  </div>
</template>

<style scoped>
.access-control-step {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mb-4 {
  margin-block-end: 16px;
}

.permissions-card {
  border-radius: 12px;
  border: 1px solid var(--el-border-color-light);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.permissions-grid {
  gap: 16px;
}

.flex-1 {
  flex: 1;
  min-inline-size: 240px;
}
</style>
