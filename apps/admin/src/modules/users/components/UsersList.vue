<template>
  <BlockItem v-for="user in filteredUsers" :key="user._id">
    <template v-slot:title>
      <router-link :to="{ name: 'editUser', params: { userId: user._id } }">{{ getUserFullName(user) }}</router-link>
    </template>
    <div class="metadata">
      <p v-if="user.username">{{ $t('Username') }}: {{ user.username }}</p>
      <p>
        {{ $t('Roles') }}:
        <el-tag v-for="tag in user.roles" :key="tag" class="role">{{ tag }}</el-tag>
      </p>
    </div>
    <template v-slot:actions>
     <RemoveButton wide @click="remove(user)"/>
    </template>
  </BlockItem>
</template>
<script lang="ts" setup>
import { useUsersList, useRemoveUser } from '../compositions/users';
const { filteredUsers } = useUsersList();
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';

const { users } = useUsersList();
const { remove } = useRemoveUser((id) => {
  users.value = users.value.filter((user) => user._id !== id);
});

function getUserFullName(user) {
  let fullName = user.name || user.fullName;
  if (fullName) {
    return fullName;
  }
  if (user.firstName) {
    return user.firstName + (user.lastName ? ' ' + user.lastName : '');
  }
  return 'Unknown';
}
</script>
<style scoped>
.metadata {
  padding: 0 10px 10px 10px;
}
.role {
  margin-inline: 5px;
}
</style>