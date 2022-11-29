<template>
  <GpItem v-for="user in users" :key="user._id">
    <template v-slot:title>
      <router-link :to="{name: 'editUser', params: {userId: user._id}}">{{ getUserFullName(user) }}</router-link>
    </template>
    <div class="metadata">
      <p>{{ $t('Email') }}: <a :href="'mailto:' + user.email" @click.stop>{{ user.email }}</a></p>
      <p>{{ $t('Roles') }}: {{ join(user.roles) }}</p>
    </div>
    <template v-slot:actions>
      <a @click.prevent="remove(user)">
        <el-icon>
          <icon-delete/>
        </el-icon>
        {{ $t('Remove') }}
      </a>
    </template>
  </GpItem>
</template>
<script lang="ts" setup>
import {useUsersList, useRemoveUser} from '../compositions/users'
import GpItem from '@/modules/core/components/layout/GpItem.vue';

const {users} = useUsersList()
const {remove} = useRemoveUser((id) => {
  users.value = users.value.filter(user => user._id !== id)
})

const join = (arr) => arr.join(', ')

function getUserFullName(user) {
  let fullName = user.name || user.fullName;
  if (fullName) {
    return fullName;
  }
  if (user.firstName) {
    return user.firstName + (user.lastName ? ' ' + user.lastName : '')
  }
  return 'Unknown'
}
</script>
<style scoped>
.metadata {
  padding: 0 10px 10px 10px;
}

</style>