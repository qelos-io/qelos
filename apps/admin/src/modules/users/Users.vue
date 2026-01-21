<template>
  <div class="users-page">
    <!-- Breadcrumb Navigation -->
    <el-breadcrumb class="users-breadcrumb" separator="/">
      <el-breadcrumb-item>
        <font-awesome-icon :icon="['fas', 'users']" class="breadcrumb-icon" />
        {{ $t('Users') }}
      </el-breadcrumb-item>
    </el-breadcrumb>
    
    <div class="header-container">
      <ListPageTitle title="Users" create-route="createUser">
        <template v-slot:content>
          <div class="filter-container">
            <UserFilter :users="users"/>
          </div>
        </template>
      </ListPageTitle>
    </div>

    <UsersList :users="filteredUsers" @removed="removeUser"/>
  </div>
</template>

<script lang="ts" setup>
import UsersList from './components/UsersList.vue';
import ListPageTitle from '../core/components/semantics/ListPageTitle.vue';
import UserFilter from './components/UserFilter.vue';
import { useUsersList } from '@/modules/users/compositions/users';
const { filteredUsers, users, removeUser } = useUsersList();
</script>

<style scoped>
.users-page {
  padding: 20px;
}

.users-breadcrumb {
  margin-bottom: 20px;
  padding: 10px 0;
}

.breadcrumb-icon {
  margin-right: 5px;
  color: var(--el-color-primary);
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-container {
  margin: 0 20px;
}

@media (max-width: 768px) {
  .users-page {
    padding: 10px;
  }
  
  .users-breadcrumb {
    margin-bottom: 15px;
    font-size: 0.9rem;
  }
  
  .filter-container {
    margin: 0 5px;
  }
  
  .header-container {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
