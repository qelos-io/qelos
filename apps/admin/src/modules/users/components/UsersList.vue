<template>
  <BlockItem v-for="user in users" :key="user._id">
    <template v-slot:title>
      <router-link :to="{ name: 'editUser', params: { userId: user._id } }">
        <el-avatar class="avatar-img" v-if="user.profileImage" :src="user.profileImage" />
        {{ getUserFullName(user) }}
      </router-link>
    </template>
    <div class="metadata">
      <p v-if="user.username">{{ $t('Username') }}: {{ user.username }}</p>
      <p v-if="user.emailVerified">{{ $t('Email Verified') }}</p>
      <p v-if="user.socialLogins?.length">
        <font-awesome-icon v-for="icon in user.socialLogins" :key="icon" :icon="['fab', icon]"/>
      </p>
      <p>
        {{ $t('Roles') }}:
        <el-tag v-for="tag in user.roles" :key="tag" class="role">{{ tag }}</el-tag>
      </p>
    </div>
    <template v-slot:actions>
      <div class="flex-row flex-space">
        <RemoveButton wide @click="remove(user)"/>
        <router-link :to="{ name: 'editUser', params: { userId: user._id } }">
          <el-button text>{{ $t('More') }}</el-button>
        </router-link>
      </div>

    </template>
  </BlockItem>
</template>
<script lang="ts" setup>
import { useRemoveUser } from '../compositions/users';

defineProps<{ users: IUser[] }>()
const emit = defineEmits(['removed']);
import BlockItem from '@/modules/core/components/layout/BlockItem.vue';
import RemoveButton from '@/modules/core/components/forms/RemoveButton.vue';
import { IUser } from '@/modules/core/store/types/user';

const { remove } = useRemoveUser((id) => {
  emit('removed', id);
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
.avatar-img {
  margin: 0;
}
</style>