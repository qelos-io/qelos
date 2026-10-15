<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Delete, Edit, MoreFilled } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import useWorkspacesList from '../store/workspaces-list';
import { authStore } from '@/modules/core/store/auth';
import { lastSeen, relativeTime, isJustNow } from '@/modules/users/services/user-presentation';
import { type MyRole } from '../services/workspace-presentation';
import WorkspaceAvatar from './WorkspaceAvatar.vue';

const props = defineProps<{ workspaces: any[]; roleOf: (workspace: any) => MyRole; loading?: boolean; filtered?: boolean; canCreate?: boolean }>();
const emit = defineEmits<{ (e: 'create'): void }>();

const { t, locale } = useI18n();
const router = useRouter();
const store = useWorkspacesList();
const activating = ref('');

const PAGE_SIZE = 25;
const page = ref(1);
const shown = computed(() => props.workspaces.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));
watch(() => props.workspaces, () => (page.value = 1));

const isCurrent = (workspace: any) => authStore.user?.workspace?._id === workspace._id;
const roleLabel = (role: MyRole) => ({ admin: t('Admin'), manager: t('Manager'), member: t('Member'), guest: t('Guest') })[role];
const edit = (workspace: any) => router.push({ name: 'editMyWorkspace', params: { id: workspace._id } });

function accessed(workspace: any) {
  const date = lastSeen({ lastLogin: { created: workspace.lastAccessed } });
  if (!date) return '';
  return isJustNow(date) ? t('Opened just now') : t('Opened {time}', { time: relativeTime(date, new Date(), locale.value) });
}

async function switchTo(workspace: any) {
  activating.value = workspace._id;
  try {
    await store.activate(workspace);
  } catch {
    ElMessage.error(t('Failed to switch workspace'));
  } finally {
    activating.value = '';
  }
}
</script>

<template>
  <div class="list">
    <ul v-if="loading" class="rows" aria-hidden="true">
      <li v-for="i in 3" :key="i" class="row skeleton"><el-skeleton animated><template #template><el-skeleton-item variant="text" style="inline-size: 35%" /></template></el-skeleton></li>
    </ul>

    <div v-else-if="!workspaces.length" class="empty">
      <el-empty :description="filtered ? $t('No workspace matches your search') : $t('You are not in any workspace yet')">
        <el-button v-if="!filtered && canCreate" type="primary" @click="$emit('create')">{{ $t('Create workspace') }}</el-button>
      </el-empty>
    </div>

    <template v-else>
      <ul class="rows">
        <li v-for="workspace in shown" :key="workspace._id" class="row" :class="{ current: isCurrent(workspace) }" @click="edit(workspace)">
          <WorkspaceAvatar :name="workspace.name" :logo="workspace.logo" :size="40" />
          <div class="who">
            <router-link class="name" dir="auto" :to="{ name: 'editMyWorkspace', params: { id: workspace._id } }" @click.stop>{{ workspace.name }}</router-link>
            <span class="sub">{{ roleLabel(roleOf(workspace)) }} · {{ $t('{count} members', { count: workspace.members?.length || 0 }) }}</span>
          </div>
          <span class="seen">{{ accessed(workspace) }}</span>
          <div class="state" @click.stop>
            <el-tag v-if="isCurrent(workspace)" type="success" effect="light" size="small">{{ $t('Current') }}</el-tag>
            <el-button v-else :loading="activating === workspace._id" @click="switchTo(workspace)">{{ $t('Switch to workspace') }}</el-button>
          </div>
          <el-dropdown trigger="click" @click.stop>
            <el-button text circle :aria-label="`${$t('Actions')}: ${workspace.name}`" @click.stop><el-icon><MoreFilled /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="Edit" @click="edit(workspace)">{{ $t('Open') }}</el-dropdown-item>
                <el-dropdown-item v-if="workspace.isPrivilegedUser" :icon="Delete" divided @click="store.remove(workspace._id)">{{ $t('Remove') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </li>
      </ul>
      <el-pagination v-if="workspaces.length > PAGE_SIZE" v-model:current-page="page" class="pager" :page-size="PAGE_SIZE" :total="workspaces.length" layout="prev, pager, next" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: auto minmax(0, 1.4fr) minmax(110px, auto) minmax(120px, auto) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--surface, var(--el-bg-color));
  cursor: pointer;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: var(--el-border-color);
  }

  &:focus-within {
    border-color: var(--el-color-primary);
  }

  &.current {
    border-color: var(--el-color-success-light-5);
  }

  &.skeleton {
    min-block-size: 62px;
    cursor: default;
  }
}

.who {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.name {
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-weight: 600;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--el-color-primary);
  }
}

.sub,
.seen {
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.state {
  display: flex;
  justify-content: flex-end;
}

.pager {
  justify-content: center;
  margin-block-start: 16px;
}

@media (max-width: 800px) {
  .row {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: 'avatar who menu' '. state state' '. seen seen';
    row-gap: 8px;

    > :nth-child(1) { grid-area: avatar; }
    > .who { grid-area: who; }
    > .seen { grid-area: seen; }
    > .state { grid-area: state; justify-content: flex-start; }
    > :last-child { grid-area: menu; }

    :deep(.el-button.is-circle) {
      inline-size: 40px;
      block-size: 40px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .row {
    transition: none;
  }
}
</style>
