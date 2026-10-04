<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

defineProps<{ active: 'plans' | 'coupons' | 'workspaces' | 'users' | 'configuration' }>();

const { t } = useI18n();
const wsConfig = useWsConfiguration();
</script>

<template>
  <div class="tab-links">
    <router-link :to="{ name: 'pricing-plans' }" class="tab-link" :class="{ active: active === 'plans' }">
      <font-awesome-icon :icon="['fas', 'tags']" />
      {{ t('Plans') }}
    </router-link>
    <router-link :to="{ name: 'coupons' }" class="tab-link" :class="{ active: active === 'coupons' }">
      <font-awesome-icon :icon="['fas', 'ticket']" />
      {{ t('Coupons') }}
    </router-link>
    <router-link :to="{ name: 'workspace-subscriptions' }" class="tab-link" :class="{ active: active === 'workspaces' }">
      <font-awesome-icon :icon="['fas', 'building']" />
      {{ t('Workspaces') }}
    </router-link>
    <router-link
      v-if="wsConfig.loaded && !wsConfig.isActive"
      :to="{ name: 'user-subscriptions' }"
      class="tab-link"
      :class="{ active: active === 'users' }"
    >
      <font-awesome-icon :icon="['fas', 'user']" />
      {{ t('Users') }}
    </router-link>
    <router-link :to="{ name: 'paymentsConfiguration' }" class="tab-link" :class="{ active: active === 'configuration' }">
      <font-awesome-icon :icon="['fas', 'gear']" />
      {{ t('Configuration') }}
    </router-link>
  </div>
</template>

<style scoped>
.tab-links {
  display: flex;
  gap: 8px;
}

.tab-link {
  padding: 6px 14px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--el-text-color-regular);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.tab-link:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.tab-link.active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}
</style>
