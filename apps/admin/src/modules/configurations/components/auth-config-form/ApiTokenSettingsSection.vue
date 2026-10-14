<script lang="ts" setup>
import { computed } from 'vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import ConfigCard from '../ConfigCard.vue';
import SettingRow from '../SettingRow.vue';

const allowUserTokenAuthentication = defineModel<boolean>('allowUserTokenAuthentication', { required: true });
const tokenPermissions = defineModel<{ roles: string[]; wsRoles: string[] }>('tokenAuthenticationPermissions', { required: true });

const wsConfig = useWsConfiguration();
const wsConfigActive = computed(() => wsConfig.isActive);

const availableRoles = ['user', 'admin', 'editor', 'plugin'];
</script>

<template>
  <ConfigCard id="auth-tokens" :title="$t('API Token Authentication')" :description="$t('Long-lived tokens for CLI, SDK, and plugin access.')">
    <SettingRow :title="$t('Allow API Token Authentication?')" :description="$t('When enabled, permitted users can generate long-lived API tokens for CLI, SDK, and plugin access')">
      <template #default="{ labelledBy }"><el-switch v-model="allowUserTokenAuthentication" :aria-labelledby="labelledBy" /></template>
    </SettingRow>

    <template v-if="allowUserTokenAuthentication">
      <el-form-item :label="$t('Allowed Roles')" class="field">
        <el-select v-model="tokenPermissions.roles" multiple filterable allow-create default-first-option :placeholder="$t('Select or type roles (use * for all users)')" style="width: 100%">
          <el-option label="* (All Users)" value="*" />
          <el-option v-for="role in availableRoles" :key="role" :label="role" :value="role" />
        </el-select>
        <span class="help">{{ $t('User roles that are allowed to create and manage API tokens') }}</span>
      </el-form-item>

      <el-form-item v-if="wsConfigActive" :label="$t('Allowed Workspace Roles')" class="field">
        <el-select v-model="tokenPermissions.wsRoles" multiple filterable allow-create default-first-option :placeholder="$t('Select or type workspace roles')" style="width: 100%">
          <el-option label="* (All Workspace Roles)" value="*" />
        </el-select>
        <span class="help">{{ $t('Workspace roles that are allowed to create API tokens (when workspace config is active)') }}</span>
      </el-form-item>
    </template>
  </ConfigCard>
</template>

<style scoped lang="scss">
.field {
  margin: 0;
}

.help {
  display: block;
  margin-block-start: 4px;
  color: var(--el-text-color-secondary);
  font-size: 0.82rem;
  line-height: 1.4;
}
</style>
