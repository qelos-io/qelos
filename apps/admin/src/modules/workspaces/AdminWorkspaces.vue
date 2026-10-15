<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import { useWsConfiguration } from '@/modules/configurations/store/ws-configuration';
import useAdminWorkspacesList from './store/admin-workspaces-list';
import AdminWorkspacesList from './components/AdminWorkspacesList.vue';
import { NO_LABEL, filterAdminWorkspaces, labelCounts } from './services/workspace-presentation';

const route = useRoute();
const router = useRouter();
const store = useAdminWorkspacesList();
const { canUserCreateWorkspace } = useWsConfiguration();

const query = computed(() => (route.query.q ? String(route.query.q) : ''));
const selected = computed<string[]>(() => {
  const labels = route.query.labels;
  return Array.isArray(labels) ? (labels as string[]) : labels ? [String(labels)] : [];
});

const counts = computed(() => labelCounts(store.workspaces || []));
const visible = computed(() => filterAdminWorkspaces(store.workspaces || [], { query: query.value, labels: selected.value }));
const filtered = computed(() => !!query.value || selected.value.length > 0);
const showChips = computed(() => counts.value.labels.length > 0);

function toggle(label: string) {
  const next = selected.value.includes(label) ? selected.value.filter((item) => item !== label) : [...selected.value, label];
  router.push({ query: { ...route.query, labels: next.length ? next : undefined } });
}
const clear = () => router.push({ query: { ...route.query, labels: undefined } });
const create = () => router.push({ name: 'adminCreateWorkspace' });
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1>{{ $t('Workspaces') }}</h1>
        <p v-if="!store.loading" class="count">{{ $t('{n} workspaces', { n: (store.workspaces || []).length }) }}</p>
      </div>
      <el-button v-if="canUserCreateWorkspace" type="primary" :icon="Plus" @click="create">{{ $t('Create workspace') }}</el-button>
    </header>

    <div v-if="showChips" class="chips" role="group" :aria-label="$t('Filter by label')">
      <button type="button" class="chip" :class="{ on: !selected.length }" :aria-pressed="!selected.length" @click="clear">{{ $t('All') }}<span>{{ (store.workspaces || []).length }}</span></button>
      <button v-for="item in counts.labels" :key="item.label" type="button" class="chip" :class="{ on: selected.includes(item.label) }" :aria-pressed="selected.includes(item.label)" @click="toggle(item.label)">{{ item.label }}<span>{{ item.count }}</span></button>
      <button v-if="counts.unlabeled" type="button" class="chip" :class="{ on: selected.includes(NO_LABEL) }" :aria-pressed="selected.includes(NO_LABEL)" @click="toggle(NO_LABEL)">{{ $t('No label') }}<span>{{ counts.unlabeled }}</span></button>
    </div>

    <AdminWorkspacesList :workspaces="visible" :filtered="filtered" @create="create" />
  </div>
</template>

<style scoped lang="scss">
.page {
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
  .page {
    padding-inline: 12px;
  }
}
</style>
