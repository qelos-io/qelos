<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Delete, MoreFilled, View } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import useAdminWorkspacesList from '../store/admin-workspaces-list';
import WorkspaceAvatar from './WorkspaceAvatar.vue';

const props = defineProps<{ workspaces: any[]; filtered?: boolean }>();
const emit = defineEmits<{ (e: 'create'): void }>();

const { t, locale } = useI18n();
const router = useRouter();
const store = useAdminWorkspacesList();

const PAGE_SIZE = 25;
const page = ref(1);
const shown = computed(() => props.workspaces.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));
watch(() => props.workspaces, () => (page.value = 1));

onMounted(() => {
  if (!store.workspaces.length) store.reload();
});

const open = (id: string) => router.push({ name: 'adminEditWorkspace', params: { id } });
const created = (value?: string) => (value ? new Intl.DateTimeFormat(locale.value || undefined, { dateStyle: 'medium' }).format(new Date(value)) : '');

async function command(name: string, workspace: any) {
  if (name === 'open') open(workspace._id);
  else if (name === 'copy') {
    try {
      await navigator.clipboard.writeText(workspace._id);
      ElMessage.success(t('Copied'));
    } catch {
      ElMessage.error(t('Copy failed'));
    }
  } else if (name === 'remove') store.remove(workspace._id);
}
</script>

<template>
  <div class="list">
    <ul v-if="store.loading && !store.workspaces.length" class="rows" aria-hidden="true">
      <li v-for="i in 4" :key="i" class="row skeleton"><el-skeleton animated><template #template><el-skeleton-item variant="text" style="inline-size: 35%" /></template></el-skeleton></li>
    </ul>

    <div v-else-if="!workspaces.length" class="empty">
      <el-empty :description="filtered ? $t('No workspace matches your search') : $t('No workspaces yet')">
        <el-button v-if="!filtered" type="primary" @click="$emit('create')">{{ $t('Create workspace') }}</el-button>
      </el-empty>
    </div>

    <template v-else>
      <ul class="rows">
        <li v-for="workspace in shown" :key="workspace._id" class="row" @click="open(workspace._id)">
          <WorkspaceAvatar :name="workspace.name" :logo="workspace.logo" :size="40" />
          <div class="who">
            <router-link class="name" dir="auto" :to="{ name: 'adminEditWorkspace', params: { id: workspace._id } }" @click.stop>{{ workspace.name }}</router-link>
            <span v-if="workspace.members" class="sub">{{ $t('{count} members', { count: workspace.members.length }) }}</span>
          </div>
          <div class="labels">
            <el-tag v-for="label in workspace.labels || []" :key="label" size="small" effect="plain">{{ label }}</el-tag>
          </div>
          <span class="created">{{ created(workspace.created) }}</span>
          <el-dropdown trigger="click" @command="(name: string) => command(name, workspace)" @click.stop>
            <el-button text circle :aria-label="`${$t('Actions')}: ${workspace.name}`" @click.stop><el-icon><MoreFilled /></el-icon></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="open" :icon="View">{{ $t('Open') }}</el-dropdown-item>
                <el-dropdown-item command="copy">{{ $t('Copy ID') }}</el-dropdown-item>
                <el-dropdown-item command="remove" :icon="Delete" divided>{{ $t('Delete workspace') }}</el-dropdown-item>
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
  grid-template-columns: auto minmax(0, 1.2fr) minmax(0, 1fr) minmax(90px, auto) auto;
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
.created {
  color: var(--el-text-color-secondary);
  font-size: 0.85rem;
}

.labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pager {
  justify-content: center;
  margin-block-start: 16px;
}

@media (max-width: 800px) {
  .row {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-areas: 'avatar who menu' '. labels labels' '. created created';
    row-gap: 6px;

    > :nth-child(1) { grid-area: avatar; }
    > .who { grid-area: who; }
    > .labels { grid-area: labels; }
    > .created { grid-area: created; }
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
