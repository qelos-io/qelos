<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import { useUsersList } from './compositions/users';
import UsersList from './components/UsersList.vue';

const router = useRouter();
const { view, roles, query, loading, setRoles, removeUser } = useUsersList();

const filtered = computed(() => !!query.value || roles.value.length > 0);
const toggleRole = (role: string) => setRoles(roles.value.includes(role) ? roles.value.filter((r) => r !== role) : [...roles.value, role]);
const create = () => router.push({ name: 'createUser' });
</script>

<template>
  <div class="users-page">
    <header class="head">
      <div>
        <h1>{{ $t('Users') }}</h1>
        <p v-if="!loading" class="count">{{ $t('{n} people', { n: view.totalPeople }) }}</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="create">{{ $t('Create user') }}</el-button>
    </header>

    <div v-if="view.roleCounts.length > 1" class="chips" role="group" :aria-label="$t('Filter by role')">
      <button type="button" class="chip" :class="{ on: !roles.length }" :aria-pressed="!roles.length" @click="setRoles([])">{{ $t('All') }}<span>{{ view.totalPeople }}</span></button>
      <button v-for="item in view.roleCounts" :key="item.role" type="button" class="chip" :class="{ on: roles.includes(item.role) }" :aria-pressed="roles.includes(item.role)" @click="toggleRole(item.role)">
        {{ item.role }}<span>{{ item.count }}</span>
      </button>
    </div>

    <UsersList :people="view.people" :services="view.services" :loading="loading" :filtered="filtered" @removed="removeUser" @create="create" />
  </div>
</template>

<style scoped lang="scss">
.users-page {
  padding: 8px 20px 24px;
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-block-end: 14px;

  h1 {
    margin: 0;
    padding: 0;
    font-size: 1.5rem;
    line-height: 1.25;
  }

  .count {
    margin: 2px 0 0;
    padding: 0;
    color: var(--el-text-color-secondary);
  }
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-block-end: 14px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 0.88rem;
  cursor: pointer;

  span {
    color: var(--el-text-color-placeholder);
    font-size: 0.78rem;
  }

  &.on {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);

    span {
      color: inherit;
    }
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

@media (max-width: 640px) {
  .users-page {
    padding-inline: 12px;
  }
}
</style>
