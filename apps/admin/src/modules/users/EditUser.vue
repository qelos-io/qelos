<template>
  <div class="edit-user">
    <Breadcrumb :items="breadcrumbItems" />
    
    <div class="user-header" v-if="user">
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
      </div>
    </div>
    <el-skeleton v-else :rows="3" animated />

    <div class="user-form-container" v-if="user">
      <UserForm :user="user" @submitted="handleUserUpdate" :submitting="submitting" :as-admin="true">
      </UserForm>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useEditUsers } from './compositions/users'
import UserForm from './components/UserForm.vue'
import { useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import Breadcrumb from '@/modules/core/components/Breadcrumb.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface BreadcrumbItem {
  text: string
  icon?: any
  to?: string | object
}

const route = useRoute()
const userId = route.params.userId
const { user, updateUser, submitting, refreshUser } = useEditUsers(userId)
const { t } = useI18n()

const breadcrumbItems = computed((): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [
    { text: t('Users'), icon: ArrowLeft, to: { name: 'users' } }
  ]
  
  if (user.value) {
    items.push({
      text: `${decodeURIComponent(user.value.firstName || '')} ${decodeURIComponent(user.value.lastName || '')}`
    })
  }
  
  return items
})

// Handle user update with refresh
const handleUserUpdate = async (userData: any) => {
  try {
    await updateUser(userData)
    // Refresh user data to get updated profile image
    await refreshUser()
  } catch (error) {
    // Error is handled by the composition
  }
}
</script>

<style scoped>
.edit-user {
  padding: 20px;
  margin: 0 auto;
}

.user-breadcrumb {
  margin-bottom: 20px;
  padding: 10px 0;
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

@media (max-width: 768px) {
  .edit-user {
    padding: 10px;
  }
  
  .user-breadcrumb {
    margin-bottom: 15px;
    font-size: 0.9rem;
  }
  
  .user-info {
    flex-direction: column;
    text-align: center;
  }
  
  .user-details h1 {
    font-size: 1.5rem;
  }
}
</style>
