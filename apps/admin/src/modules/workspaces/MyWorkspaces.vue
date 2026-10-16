<script lang="ts" setup>
import AppPage from '@/modules/core/components/layout/AppPage.vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '@/modules/core/compositions/authentication';
import { authStore } from '@/modules/core/store/auth';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import useWorkspacesList from './store/workspaces-list';
import InvitesList from './components/InvitesList.vue';
import WorkspacesList from './components/WorkspacesList.vue';
import { filterMyWorkspaces, myRole, myRoleCounts, type MyRole } from './services/workspace-presentation';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { user } = useAuth();
const store = useWorkspacesList();
const wsConfig = useWsConfiguration();

onMounted(() => {
  if (!store.workspaces.length) store.reload();
});

const role = ref<MyRole | ''>('');
const query = computed(() => (route.query.q ? String(route.query.q) : ''));
const userId = computed(() => user.value?._id || '');
const roleOf = (workspace: any) => myRole(workspace, userId.value);

const counts = computed(() => myRoleCounts(store.workspaces || [], userId.value));
const visible = computed(() => filterMyWorkspaces(store.workspaces || [], { query: query.value, role: role.value, userId: userId.value, activeId: authStore.user?.workspace?._id }));
const filtered = computed(() => !!query.value || !!role.value);
const roleLabel = (value: MyRole) => ({ admin: t('Admin'), manager: t('Manager'), member: t('Member'), guest: t('Guest') })[value];
const create = () => router.push({ name: 'createMyWorkspace' });
</script>

<template>
  <AppPage :title="$t('Workspaces')" :subtitle="store.loading ? undefined : $t('{n} workspaces', { n: (store.workspaces || []).length })">
    <template v-if="wsConfig.canUserCreateWorkspace" #actions>
      <el-button type="primary" :icon="Plus" @click="create">{{ $t('Create workspace') }}</el-button>
    </template>

    <InvitesList />

    <div v-if="counts.length > 1" class="chips" role="group" :aria-label="$t('Filter by role')">
      <button type="button" class="chip" :class="{ on: !role }" :aria-pressed="!role" @click="role = ''">{{ $t('All') }}<span>{{ (store.workspaces || []).length }}</span></button>
      <button v-for="item in counts" :key="item.role" type="button" class="chip" :class="{ on: role === item.role }" :aria-pressed="role === item.role" @click="role = role === item.role ? '' : item.role">{{ roleLabel(item.role) }}<span>{{ item.count }}</span></button>
    </div>

    <WorkspacesList :workspaces="visible" :role-of="roleOf" :loading="store.loading && !(store.workspaces || []).length" :filtered="filtered" :can-create="wsConfig.canUserCreateWorkspace" @create="create" />
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
