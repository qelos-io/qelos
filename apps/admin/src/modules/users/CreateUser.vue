<template>
  <div>
    <UserForm :user="{}" @submitted="save" :as-admin="true">
      {{ $t('Create User') }}
    </UserForm>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useCreateUser } from './compositions/users'
import UserForm from './components/UserForm.vue'

const router = useRouter()

const { createUser } = useCreateUser()

const save = async user => {
  const { _id } = await createUser(user)
  await router.push({ name: 'editUser', params: { userId: _id } })
};
</script>
