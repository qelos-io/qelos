<script lang="ts" setup>
import AppPage from '@/modules/core/components/layout/AppPage.vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Plus } from '@element-plus/icons-vue';
import { useBlueprintsStore } from '@/modules/no-code/store/blueprints';
import BlueprintsList from '@/modules/no-code/components/BlueprintsList.vue';
import BlueprintCreateDrawer from '@/modules/no-code/components/BlueprintCreateDrawer.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useBlueprintsStore();

const view = computed<'list' | 'graph'>(() => (route.query.view === 'graph' ? 'graph' : 'list'));
const total = computed(() => store.blueprints?.length || 0);
const links = computed(() => (store.blueprints || []).reduce((sum, blueprint) => sum + (blueprint.relations?.length || 0), 0));

const subtitle = computed(() => {
  if (!store.loaded) return undefined;
  const count = total.value === 1 ? t('1 blueprint') : t('{count} blueprints', { count: total.value });
  if (!links.value) return count;
  return `${count} · ${links.value === 1 ? t('1 link') : t('{count} links', { count: links.value })}`;
});

const setView = (next: 'list' | 'graph') => router.replace({ query: { ...route.query, view: next === 'graph' ? 'graph' : undefined } });
const openCreate = () => router.push({ query: { ...route.query, mode: 'create' } });
const closeCreate = () => router.replace({ query: { ...route.query, mode: undefined } });
</script>

<template>
  <AppPage :title="$t('Blueprints')" :subtitle="subtitle">
    <template #actions>
      <el-button type="primary" :icon="Plus" @click="openCreate">{{ $t('New blueprint') }}</el-button>
    </template>

    <div class="views" role="group" :aria-label="$t('View')">
      <button type="button" class="chip" :class="{ on: view === 'list' }" :aria-pressed="view === 'list'" @click="setView('list')">{{ $t('List') }}</button>
      <button type="button" class="chip" :class="{ on: view === 'graph' }" :aria-pressed="view === 'graph'" @click="setView('graph')">{{ $t('Relations') }}</button>
    </div>

    <BlueprintsList :q="route.query.q as string" />
    <BlueprintCreateDrawer :visible="route.query.mode === 'create'" @close="closeCreate" />
  </AppPage>
</template>

<style scoped lang="scss">
.views {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--el-text-color-regular);
  font: inherit;
  font-size: 0.88rem;
  cursor: pointer;

  &.on {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

</style>
