<template>
  <UserEditor v-if="user" :key="user._id" :user="user" mode="edit" :submitting="submitting" :save="save" />
  <el-skeleton v-else animated :rows="5" class="loading" />
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';
import { useEditUsers } from './compositions/users';
import UserEditor from './components/UserEditor.vue';

const { user, updateUser, submitting, refreshUser } = useEditUsers(useRoute().params.userId);

async function save(payload: Record<string, unknown>) {
  const updated = await updateUser(payload);
  if (!updated) return undefined;
  await refreshUser();
  return updated;
}
</script>

<style scoped>
.loading {
  padding: 24px 20px;
}
</style>
