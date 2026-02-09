<template>
  <div class="users-page">
    <Breadcrumb :items="breadcrumbItems" />
    
    <div class="header-container">
      <div class="filter-section">
        <UserFilter :users="users"/>
      </div>
      <el-button 
        @click="createUser" 
        class="add-button"
        type="primary"
        :aria-label="t('Create User')"
      >
        <el-icon class="el-icon--left"><Plus /></el-icon>
        {{ t('Create User') }}
      </el-button>
    </div>

    <UsersList :users="filteredUsers" @removed="removeUser"/>
  </div>
</template>

<script lang="ts" setup>
import UsersList from './components/UsersList.vue';
import UserFilter from './components/UserFilter.vue';
import Breadcrumb from '@/modules/core/components/Breadcrumb.vue';
import { Plus } from '@element-plus/icons-vue';
import { useUsersList } from '@/modules/users/compositions/users';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

interface BreadcrumbItem {
  text: string
  icon?: any
  to?: string | object
}

const router = useRouter();
const { filteredUsers, users, removeUser } = useUsersList();
const { t } = useI18n();

const breadcrumbItems = computed((): BreadcrumbItem[] => [
  { text: t('Users'), icon: ['fas', 'users'] }
])

function createUser() {
  router.push({ name: 'createUser' });
}
</script>

<style scoped>
.users-page {
  padding: 20px;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0;
}

.filter-section {
  flex: 1;
}

.add-button {
  margin-left: 20px;
}

@media (max-width: 768px) {
  .users-page {
    padding: 10px;
  }
  
  .header-container {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
    margin: 15px 0;
  }
  
  .filter-section {
    width: 100%;
  }
  
  .add-button {
    margin-left: 0;
    width: 100%;
  }
}
</style>
