<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ArrowLeft } from '@element-plus/icons-vue';
import { useUpdateWorkspace } from './compositions/workspaces';
import { useAuth } from '@/modules/core/compositions/authentication';
import { authStore } from '@/modules/core/store/auth';
import useWorkspacesList from './store/workspaces-list';
import WorkspaceAvatar from './components/WorkspaceAvatar.vue';
import { myRole } from './services/workspace-presentation';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { user } = useAuth();
const list = useWorkspacesList();
const { workspace, updateWorkspace, loaded, retry } = useUpdateWorkspace(route.params?.id as string);

const submitting = ref(false);
const switching = ref(false);

const role = computed(() => (workspace.value ? myRole(workspace.value, user.value?._id) : 'guest'));
const roleLabel = computed(() => ({ admin: t('Admin'), manager: t('Manager'), member: t('Member'), guest: t('Guest') })[role.value]);
const isCurrent = computed(() => !!workspace.value && authStore.user?.workspace?._id === workspace.value._id);

const TABS = computed(() => [
  { name: 'editMyWorkspaceGeneral', label: t('General') },
  { name: 'editMyWorkspaceMembers', label: t('Members') },
  ...(role.value === 'admin' ? [{ name: 'editMyWorkspacePayments', label: t('Payments') }] : []),
]);
const activeTab = computed(() => String(route.name));
const go = (name: string) => name !== route.name && router.push({ name, params: { id: route.params.id } });

async function onSubmitted(data: Record<string, unknown>) {
  submitting.value = true;
  try {
    const result = await updateWorkspace(data);
    if (result) await Promise.all([retry(), list.reload()]);
    return result;
  } finally {
    submitting.value = false;
  }
}

async function switchTo() {
  switching.value = true;
  try {
    await list.activate(workspace.value);
  } finally {
    switching.value = false;
  }
}
</script>

<template>
  <div class="page">
    <el-skeleton v-if="!loaded" animated :rows="3" class="loading" />

    <el-result v-else-if="!workspace" icon="warning" :title="$t('Workspace not found')" :sub-title="$t('It may have been deleted, or you may not have access to it.')">
      <template #extra>
        <el-button @click="retry">{{ $t('Try again') }}</el-button>
        <el-button type="primary" @click="router.push({ name: 'workspaces' })">{{ $t('Back to workspaces') }}</el-button>
      </template>
    </el-result>

    <template v-else>
      <header class="head">
        <el-button text class="back" @click="router.push({ name: 'workspaces' })"><el-icon class="dir-icon"><ArrowLeft /></el-icon><span>{{ $t('Workspaces') }}</span></el-button>
        <div class="identity">
          <WorkspaceAvatar :name="workspace.name" :logo="workspace.logo" :size="56" />
          <div class="who">
            <h1 dir="auto">{{ workspace.name }}</h1>
            <p class="meta">
              <el-tag size="small" effect="light" :type="role === 'admin' ? 'danger' : role === 'manager' ? 'warning' : 'info'">{{ roleLabel }}</el-tag>
              <span>{{ $t('{count} members', { count: workspace.members?.length || 0 }) }}</span>
              <el-tag v-for="label in workspace.labels || []" :key="label" size="small" effect="plain">{{ label }}</el-tag>
            </p>
          </div>
          <div class="state">
            <el-tag v-if="isCurrent" type="success" effect="light">{{ $t('Current workspace') }}</el-tag>
            <el-button v-else type="primary" :loading="switching" @click="switchTo">{{ $t('Switch to workspace') }}</el-button>
          </div>
        </div>
      </header>

      <div class="layout">
        <nav v-if="TABS.length > 1" class="rail" :aria-label="$t('Workspace sections')">
          <button v-for="tab in TABS" :key="tab.name" type="button" class="rail-item" :class="{ on: activeTab === tab.name }" :aria-current="activeTab === tab.name ? 'page' : undefined" @click="go(tab.name)">{{ tab.label }}</button>
        </nav>

        <main class="panel">
          <router-view v-slot="{ Component }">
            <component :is="Component" :workspace-id="workspace._id" :workspace="workspace" :submitting="submitting" @refresh-workspace="retry" :save="onSubmitted" />
          </router-view>
        </main>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.loading {
  padding: 24px 20px;
}

.head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 20px 8px;
}

.back {
  margin-inline-start: -10px;
  padding-inline: 10px;
  gap: 4px;
  color: var(--el-text-color-secondary);
}

.identity {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  inline-size: 100%;
}

.who {
  min-inline-size: 0;

  h1 {
    margin: 0;
    padding: 0;
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.25;
    text-align: start;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin: 2px 0 0;
  padding: 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9rem;
}

.state {
  margin-inline-start: auto;
}

.layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 8px 20px 24px;
}

.rail {
  position: sticky;
  inset-block-start: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 0 0 200px;
}

.rail-item {
  padding: 9px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  text-align: start;
  cursor: pointer;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.on {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 600;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.panel {
  flex: 1;
  min-inline-size: 0;
  max-inline-size: 820px;
}

[dir='rtl'] .dir-icon {
  transform: scaleX(-1);
}

@media (max-width: 800px) {
  .head {
    padding-inline: 14px;
  }

  .state {
    margin-inline-start: 0;
  }

  .layout {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding-inline: 14px;
  }

  .rail {
    position: static;
    flex-direction: row;
    flex-basis: auto;
    inline-size: 100%;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .rail-item {
    flex-shrink: 0;
    white-space: nowrap;
  }

  .panel {
    inline-size: 100%;
  }
}
</style>
