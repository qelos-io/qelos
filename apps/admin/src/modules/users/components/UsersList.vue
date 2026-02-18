<template>
  <div class="users-list-container">
    <el-skeleton :loading="loading" :count="3" animated>
      <template #template>
        <div class="users-grid">
          <div class="user-skeleton" v-for="i in 3" :key="i">
            <el-skeleton-item variant="circle" style="width: 50px; height: 50px" />
            <el-skeleton-item variant="h3" style="width: 40%" />
            <el-skeleton-item variant="text" style="width: 60%" />
            <el-skeleton-item variant="text" style="width: 50%" />
          </div>
        </div>
      </template>
      
      <template #default>
        <!-- Empty state -->
        <div v-if="filteredUsers.length === 0" class="empty-state">
          <el-empty :description="$t('No users found')">
            <el-button type="primary" @click="$router.push({ name: 'createUser' })">
              <el-icon><icon-plus /></el-icon>
              {{ $t('Add User') }}
            </el-button>
          </el-empty>
        </div>

        <!-- Users list with cards -->
        <div v-else class="users-grid">
          <div 
            v-for="user in paginatedUsers" 
            :key="user._id"
            class="user-card"
            @click="$router.push({name: 'editUser', params: {userId: user._id}})"
          >
        <div class="user-card-header">
          <div class="user-avatar">
            <el-avatar 
              :size="50" 
              :src="user.profileImage || getUserInitialsAvatar(user)" 
              :alt="getUserFullName(user)"
            />
          </div>
          <div class="user-info">
            <h3 class="user-name">
              {{ getUserFullName(user) }}
            </h3>
            <p v-if="user.username" class="user-username">@{{ user.username }}</p>
          </div>
          <div class="verification-badges">
            <el-tooltip v-if="user.emailVerified" :content="$t('Email Verified')" placement="top">
              <el-icon class="verified-icon"><Check /></el-icon>
            </el-tooltip>
          </div>
        </div>

        <div class="user-card-body">
          <div v-if="user.socialLogins?.length" class="social-logins">
            <font-awesome-icon 
              v-for="icon in user.socialLogins" 
              :key="icon" 
              :icon="['fab', icon]"
              class="social-icon"
            />
          </div>
          
          <div class="user-roles">
            <el-tag 
              v-for="tag in user.roles" 
              :key="tag" 
              class="role-tag"
              :type="getRoleTagType(tag)"
              size="small"
              effect="light"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>

          <div class="user-card-actions">
            <el-tooltip :content="$t('Edit User')" placement="top">
              <el-button 
                type="primary" 
                circle 
                @click.stop="$router.push({name: 'editUser', params: {userId: user._id}})"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip 
              v-if="isAdmin && authStore.user?._id !== user._id" 
              :content="$t('Impersonate User')" 
              placement="top"
            >
              <el-button 
                type="warning" 
                circle 
                @click.stop="impersonate(user)"
              >
                <el-icon><User /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip :content="$t('Remove User')" placement="top">
              <el-button 
                type="danger" 
                circle 
                @click.stop="remove(user)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
              
            </el-tooltip>
          </div>
          </div>
          
          <AddNewCard 
            :title="$t('Create new User')"
            :description="$t('Add a new user to your workspace')"
            :to="{ name: 'createUser' }"
          />
        </div>

        <!-- Pagination -->
        <div class="pagination-container" v-if="filteredUsers.length > pageSize">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="filteredUsers.length"
            layout="prev, pager, next"
            @current-change="handlePageChange"
          />
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useRemoveUser } from '../compositions/users';
import { IUser } from '@/modules/core/store/types/user';
import { Edit, Delete, Check, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { isAdmin, authStore } from '@/modules/core/store/auth';
import { impersonateUser } from '@/services/sdk';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';

import AddNewCard from '@/modules/core/components/cards/AddNewCard.vue';

const props = defineProps<{ users: IUser[], loading?: boolean }>();
const emit = defineEmits(['removed']);

// Initialize workspace configuration
const wsConfig = useWsConfiguration();

// Search and filter state
const searchQuery = ref('');
const roleFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(32); // Number of users per page

// Remove user functionality
const { remove } = useRemoveUser((id) => {
  emit('removed', id);
});

// Impersonate user functionality
function impersonate(user: IUser) {
  const userToImpersonate = {
    _id: user._id,
    name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName || user.email,
    email: user.email,
  };

  // Don't impersonate if trying to impersonate yourself
  if (userToImpersonate._id === authStore.user?._id) {
    ElMessage.warning('Cannot impersonate yourself');
    return;
  }

  // Use the SDK wrapper which updates the store
  impersonateUser(userToImpersonate);
  ElMessage.success(`Now impersonating ${userToImpersonate.name || userToImpersonate.email}`);
  
  // Reload the page to apply impersonation
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

// Extract all unique roles from users for the filter dropdown
const availableRoles = computed(() => {
  const roles = new Set();
  props.users.forEach(user => {
    if (user.roles && user.roles.length) {
      user.roles.forEach(role => roles.add(role));
    }
  });
  return Array.from(roles);
});

// Filter users based on search query and role filter
const filteredUsers = computed(() => {
  let result = [...props.users];
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(user => {
      const fullName = getUserFullName(user).toLowerCase();
      const username = (user.username || '').toLowerCase();
      return fullName.includes(query) || username.includes(query);
    });
  }
  
  if (roleFilter.value) {
    result = result.filter(user => 
      user.roles && user.roles.includes(roleFilter.value)
    );
  }
  
  return result;
});

// Get paginated users based on current page
const paginatedUsers = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value;
  return filteredUsers.value.slice(startIndex, startIndex + pageSize.value);
});

// Reset to first page when filters change
watch([searchQuery, roleFilter], () => {
  currentPage.value = 1;
});

// Reset to first page when users prop changes
watch(() => props.users, () => {
  currentPage.value = 1;
}, { deep: true });

// Handle search and filter changes
function handleSearch() {
  currentPage.value = 1; // Reset to first page on search
}

// Handle page change
function handlePageChange(page) {
  currentPage.value = page;
}

// Get user's full name
function getUserFullName(user) {
  let fullName = user.name || user.fullName;
  if (fullName) {
    return decodeURIComponent(fullName);
  }
  if (user.firstName) {
    return decodeURIComponent(user.firstName) + (user.lastName ? ' ' + decodeURIComponent(user.lastName) : '');
  }
  return 'Unknown';
}

// Generate avatar with initials when no profile image exists
function getUserInitialsAvatar(user) {
  const name = getUserFullName(user);
  if (name === 'Unknown') {
    return null; // Default avatar will be used
  }
  
  const initials = name
    .split(' ')
    .map(part => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
    
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23${getRandomColor(name)}"/><text x="50" y="50" font-size="40" text-anchor="middle" dominant-baseline="central" fill="white">${initials}</text></svg>`;
}

// Generate consistent color based on user name
function getRandomColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '3498db', '2ecc71', '9b59b6', 'e74c3c', 'f39c12', 
    '1abc9c', 'd35400', '34495e', '16a085', '27ae60'
  ];
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Get appropriate tag type based on role name
function getRoleTagType(role) {
  const roleMap = {
    'admin': 'danger',
    'owner': 'danger',
    'editor': 'warning',
    'user': 'info',
    'viewer': 'success'
  };
  
  return roleMap[role.toLowerCase()] || 'info';
}
</script>

<style scoped>
.users-list-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.search-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
  width: 100%;
}

@media (max-width: 768px) {
  .users-grid {
    grid-template-columns: 1fr;
  }
  
  .search-filters {
    flex-direction: column;
  }
}

.user-card {
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #ebeef5;
}

.user-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: var(--el-color-primary-light-5);
}

.user-skeleton {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 20px;
  height: 200px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.empty-state {
  margin: 40px 0;
}

.user-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.user-avatar {
  margin-right: 12px;
}

.user-info {
  flex: 1;
}

.user-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.user-username {
  margin: 4px 0 0;
  font-size: 14px;
  color: #666;
}

.verification-badges {
  display: flex;
  gap: 8px;
}

.verified-icon {
  color: #2ecc71;
  font-size: 18px;
}

.user-card-body {
  flex: 1;
  margin-bottom: 16px;
}

.social-logins {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.social-icon {
  font-size: 18px;
  color: #666;
}

.user-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-tag {
  font-size: 12px;
}

.user-card-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>