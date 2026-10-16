<template>
  <div class="profile">
    <header v-if="isLoaded && user" class="head">
      <UserAvatar :name="displayName" :src="user.profileImage" :size="64" />
      <div class="who">
        <h1 dir="auto">{{ displayName }}</h1>
        <p dir="ltr">{{ user.username }}</p>
      </div>
      <el-button class="logout" plain type="danger" :icon="SwitchButton" :loading="isLoggingOut" @click="handleLogout">{{ $t('Logout') }}</el-button>
    </header>
    <el-skeleton v-else-if="!isLoaded" :rows="2" animated class="head" />

    <div class="layout">
      <nav v-if="tabs.length > 1" class="rail" :aria-label="$t('Profile sections')">
        <button v-for="tab in tabs" :key="tab.name" type="button" class="rail-item" :class="{ on: activeTab === tab.name }" :aria-current="activeTab === tab.name ? 'page' : undefined" @click="handleTabChange(tab.name)">{{ tab.label }}</button>
      </nav>

      <main class="panel">
        <router-view v-slot="{ Component }">
          <component v-if="user && user._id" :is="Component" :user="user" :user-id="user._id" />
          <el-skeleton v-else :rows="5" animated />
        </router-view>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/modules/core/compositions/authentication';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { useAuthConfiguration } from '@/modules/configurations/store/auth-configuration';
import { ElMessageBox, ElMessage } from 'element-plus';
import { SwitchButton } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import UserAvatar from './components/UserAvatar.vue';
import { getUserDisplayName } from './services/display-name';

const route = useRoute();
const router = useRouter();
const { user, isLoaded, logout } = useAuth();
const wsConfig = useWsConfiguration();
const authConfig = useAuthConfiguration();

const { t } = useI18n();

const activeTab = ref('general');
const isLoggingOut = ref(false);

// Map tab names to route names
const tabRouteMap = {
  general: 'updateProfile',
  payments: 'userPayments',
  apiTokens: 'userApiTokens',
};

// Control visibility of tabs
const showPaymentsTab = computed(() => {
  // Show payments tab when workspace is not active (B2C mode)
  return !wsConfig.isActive;
});

const showApiTokensTab = computed(() => {
  const config = authConfig.metadata;
  if (!config?.allowUserTokenAuthentication) return false;
  const perms = config.tokenAuthenticationPermissions;
  if (!perms?.roles?.length) return false;
  const userRoles = user.value?.roles || [];
  return perms.roles.includes('*') || perms.roles.some(role => userRoles.includes(role));
});

// Watch for route changes to update active tab
watch(() => route.name, (newName) => {
  const tabName = Object.keys(tabRouteMap).find(key => tabRouteMap[key] === newName);
  if (tabName) {
    activeTab.value = tabName;
  }
}, { immediate: true });

function handleTabChange(tabName: string) {
  const routeName = tabRouteMap[tabName];
  if (routeName && route.name !== routeName) {
    router.push({ name: routeName });
  }
}

const displayName = computed(() => (user.value ? getUserDisplayName(user.value) : ''));

const tabs = computed(() => [
  { name: 'general', label: t('Profile') },
  ...(showPaymentsTab.value ? [{ name: 'payments', label: t('Payments') }] : []),
  ...(showApiTokensTab.value ? [{ name: 'apiTokens', label: t('API Tokens') }] : []),
]);

async function handleLogout() {
  try {
    await ElMessageBox.confirm(
      'Are you sure you want to logout?',
      'Confirm Logout',
      {
        confirmButtonText: 'Logout',
        cancelButtonText: 'Cancel',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    );
    
    isLoggingOut.value = true;
    await logout();
    router.push('/login');
    // The logout function will handle redirecting to login page
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Logout error:', error);
      ElMessage.error('Failed to logout');
    }
  } finally {
    isLoggingOut.value = false;
  }
}
</script>

<style scoped>
.edit-user-profile {
  padding: 20px;
  margin: 0 auto;
}

.user-header {
  margin-bottom: 10px;
  padding: 20px;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
}

.logout-btn {
  margin-left: auto;
  transition: all 0.3s ease;
}

.logout-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.3);
}

.logout-btn span {
  margin-left: 6px;
}

.user-avatar,
.user-avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar-placeholder {
  font-size: 3rem;
  color: var(--el-text-color-placeholder);
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details h1 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.user-details p {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.user-tabs {
  margin-bottom: 0;
  width: 100%;
}

.tab-icon {
  margin-right: 8px;
}

:deep(.el-tabs__header) {
  margin-bottom: 0;
}

:deep(.el-tabs__content) {
  display: none;
}

@media (max-width: 768px) {
  .edit-user-profile {
    padding: 10px;
  }
  
  .user-breadcrumb {
    margin-bottom: 15px;
    font-size: 0.9rem;
  }
  
  .user-info {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }
  
  .logout-btn {
    margin-left: 0;
    width: 100%;
    max-width: 200px;
  }
  
  .user-details h1 {
    font-size: 1.5rem;
  }
  
  :deep(.el-tabs__header) {
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  
  :deep(.el-tabs__nav-wrap) {
    &::after {
      display: none;
    }
  }
  
  :deep(.el-tabs__item) {
    font-size: 0.9rem;
    padding: 0 10px;
    min-width: 100px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  
  :deep(.el-tabs__nav) {
    display: inline-flex;
    float: none;
  }
}
</style>

<style scoped lang="scss">
.head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px 8px;

  h1 {
    margin: 0;
    padding: 0;
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.25;
    text-align: start;
  }

  p {
    margin: 2px 0 0;
    padding: 0;
    color: var(--el-text-color-secondary);
    text-align: start;
  }
}

.who {
  min-inline-size: 0;
}

.logout {
  margin-inline-start: auto;
}

.layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 8px 20px 24px;
}

.rail {
  position: sticky;
  inset-block-start: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 0 0 200px;
}

.rail-item {
  padding: 9px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.on {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.panel {
  flex: 1;
  min-inline-size: 0;
  max-inline-size: 760px;
}

@media (max-width: 800px) {
  .head {
    flex-wrap: wrap;
    padding-inline: 14px;
  }

  .layout {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding-inline: 14px;
  }

  .panel {
    inline-size: 100%;
  }

  .rail {
    position: static;
    flex-direction: row;
    flex-basis: auto;
    inline-size: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .rail-item {
    flex-shrink: 0;
    white-space: nowrap;
  }
}
</style>
