<template>
  <div class="users-page">
    <Breadcrumb :items="breadcrumbItems" />
    
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
import Breadcrumb from '@/modules/core/components/Breadcrumb.vue';
import { useUsersList } from '@/modules/users/compositions/users';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

interface BreadcrumbItem {
  text: string
  icon?: any
  to?: string | object
}
const { filteredUsers, users, removeUser } = useUsersList();
const { t } = useI18n();

const breadcrumbItems = computed((): BreadcrumbItem[] => [
  { text: t('Users'), icon: ['fas', 'users'] }
])
</script>

<style scoped>
.users-page {
  padding: 20px;
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
  
  .header-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-container {
    margin: 10px 0;
  }
}
</style>
