<template>
  <div class="about-page">
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
.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-container {
  margin: 0 20px;
}
</style>
