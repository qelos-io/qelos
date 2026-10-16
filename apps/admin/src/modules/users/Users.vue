<script lang="ts" setup>
import AppPage from '@/modules/core/components/layout/AppPage.vue';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import { useUsersList } from './compositions/users';
import UsersList from './components/UsersList.vue';

const router = useRouter();
const { view, roles, query, loading, failed, setRoles, removeUser, reload } = useUsersList();

const filtered = computed(() => !!query.value || roles.value.length > 0);
const toggleRole = (role: string) => setRoles(roles.value.includes(role) ? roles.value.filter((r) => r !== role) : [...roles.value, role]);
const create = () => router.push({ name: 'createUser' });
</script>

<template>
  <AppPage :title="$t('Users')" :subtitle="loading ? undefined : $t('{n} people', { n: view.totalPeople })">
    <template #actions>
      <el-button type="primary" :icon="Plus" @click="create">{{ $t('Create user') }}</el-button>
    </template>

    <div v-if="view.roleCounts.length > 1" class="chips" role="group" :aria-label="$t('Filter by role')">
      <button type="button" class="chip" :class="{ on: !roles.length }" :aria-pressed="!roles.length" @click="setRoles([])">{{ $t('All') }}<span>{{ view.totalPeople }}</span></button>
      <button v-for="item in view.roleCounts" :key="item.role" type="button" class="chip" :class="{ on: roles.includes(item.role) }" :aria-pressed="roles.includes(item.role)" @click="toggleRole(item.role)">
        {{ item.role }}<span>{{ item.count }}</span>
      </button>
    </div>

    <el-alert v-if="failed && !loading" class="failed" type="error" show-icon :closable="false" :title="$t('Could not load the users')">
      <el-button size="small" @click="reload">{{ $t('Try again') }}</el-button>
    </el-alert>

    <UsersList v-else :people="view.people" :services="view.services" :loading="loading" :filtered="filtered" @removed="removeUser" @create="create" />
  </AppPage>
</template>

<style scoped lang="scss">
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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

</style>
