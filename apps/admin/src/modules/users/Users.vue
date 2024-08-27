<template>
  <div class="about-page">
    <div class="header-container">
      <ListPageTitle title="Users" create-route="createUser">
     
        <template v-slot:content>
          <div class="filter-container">
            <UserFilter />
          </div>
        </template>
        
      </ListPageTitle>

    </div>

    <UsersList />
  </div>
</template>

<script lang="ts" setup>
import UsersList from './components/UsersList.vue';
import ListPageTitle from '../core/components/semantics/ListPageTitle.vue';
import UserFilter from './components/UserFilter.vue';
import { useRouter } from 'vue-router';

const router = useRouter();

function create() {
  router.push({ name: 'createUser' });
}
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
