<template>
  <div class="edit-user-profile">    
    <div class="user-header" v-if="isLoaded && user">
      <div class="user-info">
        <div class="user-avatar" v-if="user.profileImage">
          <img :src="user.profileImage" :alt="`${decodeURIComponent(user.firstName || '')} ${decodeURIComponent(user.lastName || '')}`" />
        </div>
        <div class="user-avatar-placeholder" v-else>
          <font-awesome-icon :icon="['fas', 'user-circle']" />
        </div>
        <div class="user-details">
          <h1>{{ decodeURIComponent(user.firstName || '') }} {{ decodeURIComponent(user.lastName || '') }}</h1>
          <p>{{ user.username }}</p>
        </div>
        <el-button 
          type="danger" 
          size="small" 
          plain
          class="logout-btn"
          @click="handleLogout"
          :loading="isLoggingOut"
        >
          <font-awesome-icon :icon="['fas', 'sign-out-alt']" />
          <span>{{ $t('Logout') }}</span>
        </el-button>
      </div>
    </div>
    <el-skeleton v-else-if="!isLoaded" :rows="3" animated />

    <el-tabs 
      v-model="activeTab" 
      type="card" 
      class="user-tabs"
      @tab-change="handleTabChange"
    > 
      <el-tab-pane 
        :label="$t('General')" 
        name="general"
        :lazy="true"
      >
        <template #label>
          <font-awesome-icon :icon="['fas', 'user']" class="tab-icon" />
          {{ $t('General') }}
        </template>
      </el-tab-pane>
      
      <el-tab-pane 
        v-if="showPaymentsTab"
        :label="$t('Payments')" 
        name="payments"
        :lazy="true"
      >
        <template #label>
          <font-awesome-icon :icon="['fas', 'credit-card']" class="tab-icon" />
          {{ $t('Payments') }}
        </template>
      </el-tab-pane>
    </el-tabs>

    <div class="tab-content">
      <router-view v-slot="{ Component }">
        <component 
          v-if="user && user._id"
          :is="Component" 
          :user="user"
          :user-id="user._id"
          :submitting="submitting"
          @submitted="handleTabSubmit"
          @refresh-user="handleRefreshUser"
        />
        <el-skeleton v-else :rows="5" animated />
      </router-view>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '@/modules/core/compositions/authentication';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import { updateProfile } from '@/modules/core/store/auth';
import { useSubmitting } from '@/modules/core/compositions/submitting';
import { ElMessageBox, ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const { user, isLoaded, logout } = useAuth();
const wsConfig = useWsConfiguration();

// For profile editing, we use the authenticated user directly
// No need for useUpdateUser since we're editing the current user
const { submit, submitting } = useSubmitting((payload) => updateProfile(payload), {
  success: 'Your profile has been updated.',
  error: 'Failed to update your profile'
});

const activeTab = ref('general');
const isLoggingOut = ref(false);

// Map tab names to route names
const tabRouteMap = {
  general: 'updateProfile',
  payments: 'userPayments'
};

// Control visibility of tabs
const showPaymentsTab = computed(() => {
  // Show payments tab when workspace is not active (B2C mode)
  return !wsConfig.isActive;
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

async function handleTabSubmit(data: any) {
  try {
    await submit(data);
  } catch (error) {
    console.error('Update error:', error);
  }
}

async function handleRefreshUser() {
  try {
    // The useAuth hook automatically handles user data refresh
    // We can trigger a re-fetch if needed by calling the auth store's refresh method
    // For now, the user data is kept in sync with the auth store
  } catch (error) {
    console.error('Refresh error:', error);
  }
}

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
