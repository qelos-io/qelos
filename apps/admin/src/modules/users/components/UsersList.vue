<template>
  <div class="users-list-container">
    <!-- Empty state -->
    <el-empty v-if="filteredUsers.length === 0" :description="$t('No users found')" />

    <!-- Users list with cards -->
    <div class="users-grid">
      <el-card 
        v-for="user in paginatedUsers" 
        :key="user._id"
        class="user-card"
        :body-style="{ padding: '0px' }"
        shadow="hover"
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
          <router-link :to="{ name: 'editUser', params: { userId: user._id } }">
            <el-button class="edit-button" type="primary">
              <el-icon><Edit /></el-icon>
              {{ $t('Edit') }}
            </el-button>
          </router-link>
          <el-button class="remove-button" type="danger" @click="remove(user)">
            <el-icon><Delete /></el-icon>
            {{ $t('Remove') }}
          </el-button>
        </div>
      </el-card>
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
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRemoveUser } from '../compositions/users';
import { IUser } from '@/modules/core/store/types/user';
import { Search, Edit, Delete, Check } from '@element-plus/icons-vue';

const props = defineProps<{ users: IUser[] }>();
const emit = defineEmits(['removed']);

// Search and filter state
const searchQuery = ref('');
const roleFilter = ref('');
const currentPage = ref(1);
const pageSize = ref(32); // Number of users per page

// Remove user functionality
const { remove } = useRemoveUser((id) => {
  emit('removed', id);
});

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
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
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
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s;
}

.user-card:hover {
  transform: translateY(-5px);
}

.user-card-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #eee;
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
  padding: 16px;
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
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid #eee;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

.edit-button {
  background-color: var(--el-color-primary);
  color: white;
  border: none;
  font-size: 12px;
  padding: 8px 12px;
}

.edit-button:hover {
  background-color: var(--el-color-primary-light-3);
  color: white;
}

.remove-button {
  background-color: var(--el-color-danger);
  color: white;
  border: none;
  font-size: 12px;
  padding: 8px 12px;
}

.remove-button:hover {
  background-color: var(--el-color-danger-light-3);
  color: white;
}
</style>