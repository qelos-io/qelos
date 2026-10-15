<template>
  <UserEditor mode="create" :submitting="submitting" :save="save" />
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useCreateUser } from './compositions/users';
import UserEditor from './components/UserEditor.vue';

const router = useRouter();
const { createUser, submitting } = useCreateUser();

async function save(payload: Record<string, unknown>) {
  const created = await createUser(payload);
  if (!created?._id) return undefined;
  router.push({ name: 'editUser', params: { userId: created._id } });
  return created;
}
</script>
