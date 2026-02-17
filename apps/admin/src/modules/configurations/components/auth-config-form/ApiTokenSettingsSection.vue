<template>
  <div class="section-container">
    <h2 class="section-title">{{ $t('API Token Authentication') }}</h2>
    <BlockItem>
      <FormInput
        v-model="allowUserTokenAuthentication"
        title="Allow API Token Authentication?"
        label="Enable users to create API tokens for programmatic access"
        type="switch"
      >
        <template #help>
          <span class="help-text">{{ $t('When enabled, permitted users can generate long-lived API tokens for CLI, SDK, and plugin access') }}</span>
        </template>
      </FormInput>
    </BlockItem>

    <template v-if="allowUserTokenAuthentication">
      <h3 class="subsection-title">{{ $t('Permissions') }}</h3>
      <BlockItem>
        <el-form-item :label="$t('Allowed Roles')">
          <el-select
            v-model="tokenPermissions.roles"
            multiple
            filterable
            allow-create
            default-first-option
            :placeholder="$t('Select or type roles (use * for all users)')"
            style="width: 100%"
          >
            <el-option label="* (All Users)" value="*" />
            <el-option v-for="role in availableRoles" :key="role" :label="role" :value="role" />
          </el-select>
          <span class="help-text">{{ $t('User roles that are allowed to create and manage API tokens') }}</span>
        </el-form-item>
      </BlockItem>

      <BlockItem v-if="wsConfigActive">
        <el-form-item :label="$t('Allowed Workspace Roles')">
          <el-select
            v-model="tokenPermissions.wsRoles"
            multiple
            filterable
            allow-create
            default-first-option
            :placeholder="$t('Select or type workspace roles')"
            style="width: 100%"
          >
            <el-option label="* (All Workspace Roles)" value="*" />
          </el-select>
          <span class="help-text">{{ $t('Workspace roles that are allowed to create API tokens (when workspace config is active)') }}</span>
        </el-form-item>
      </BlockItem>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import FormInput from '@/modules/core/components/forms/FormInput.vue';
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

const allowUserTokenAuthentication = defineModel<boolean>('allowUserTokenAuthentication', { required: true });
const tokenPermissions = defineModel<{ roles: string[]; wsRoles: string[] }>('tokenAuthenticationPermissions', { required: true });

const wsConfig = useWsConfiguration();
const wsConfigActive = computed(() => wsConfig.isActive);

const availableRoles = ['user', 'admin', 'editor', 'plugin'];
</script>

<style scoped>
.section-container {
  margin-block-end: 2rem;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: var(--el-bg-color-page, #f5f7fa);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-block-start: 0;
  margin-block-end: 1rem;
  color: var(--el-text-color-primary, #303133);
  border-block-end: 1px solid var(--el-border-color-light, #e4e7ed);
  padding-block-end: 0.75rem;
}

.subsection-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-block-start: 1.5rem;
  margin-block-end: 1rem;
  color: var(--el-text-color-primary, #303133);
}

.help-text {
  font-size: 0.8rem;
  color: var(--el-text-color-secondary, #909399);
  display: block;
  margin-block-start: 0.25rem;
}

@media (max-width: 768px) {
  .section-container {
    padding: 1rem;
    margin-block-end: 1rem;
    max-width: 100%;
    overflow-x: hidden;
  }
}
</style>
