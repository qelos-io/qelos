<template>
  <div class="edit-post-page">
    <UserForm v-if="user" :user="user" @submitted="updateUser" :submitting="submitting" :as-admin="true">
      {{ $t('Edit User') }}
      <strong v-if="user?.name">{{ user.name }}</strong>
    </UserForm>
  </div>
</template>
<script lang="ts" setup>
import { useEditUsers } from './compositions/users'
import UserForm from './components/UserForm.vue'
import { useRoute } from 'vue-router'

const { user, updateUser, submitting } = useEditUsers(useRoute().params.userId);
</script>
